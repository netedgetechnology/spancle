import { randomBytes } from 'node:crypto';

// ── GST calculation types ─────────────────────────────────────────────────────

export interface GstBreakdown {
  taxableValueMinor:  number;
  cgstRateBps:        number;
  cgstAmountMinor:    number;
  sgstRateBps:        number;
  sgstAmountMinor:    number;
  igstRateBps:        number;
  igstAmountMinor:    number;
  cessRateBps:        number;
  cessAmountMinor:    number;
  totalTaxMinor:      number;
  grandTotalMinor:    number;
}

export interface LineItemGst {
  taxableMinor:      number;
  cgstAmountMinor:   number;
  sgstAmountMinor:   number;
  igstAmountMinor:   number;
  totalMinor:        number;
}

export type GstType = 'intra_state' | 'inter_state' | 'exempt' | 'zero_rated' | 'composite';

/**
 * InvoiceUtils — pure helpers for invoice domain.
 * No side effects. No external dependencies.
 */
export class InvoiceUtils {

  // ── Redis key builder ──────────────────────────────────────────────────────

  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:invoice:${suffix}`;
  }

  // ── Invoice numbering ──────────────────────────────────────────────────────

  /**
   * Formats an invoice number from components.
   * Pattern: {PREFIX}/{FY_SHORT}/{BRANCH}/{SEQ_PADDED}
   * e.g. INV/2425/MUM/000042
   *
   * @param prefix        'INV', 'CRED', 'PRO'
   * @param financialYear '2024-25'  → stored as '2425' in number
   * @param branchCode    'MUM', 'DEL', 'HO'
   * @param seq           Raw integer sequence value
   * @param seqWidth      Padding width (default 6)
   */
  static formatInvoiceNumber(
    prefix:        string,
    financialYear: string,
    branchCode:    string,
    seq:           number,
    seqWidth       = 6,
  ): string {
    // '2024-25' → '2425'
    const fyShort = financialYear.replace('-', '').replace(/20(\d{2})-(\d{2})/, '$1$2');
    const seqStr  = String(seq).padStart(seqWidth, '0');
    return `${prefix.toUpperCase()}/${fyShort}/${branchCode.toUpperCase()}/${seqStr}`;
  }

  /**
   * Returns the current Indian financial year string.
   * Indian FY runs April 1 → March 31.
   * e.g. if today is Feb 2025 → '2024-25'
   *      if today is May 2025 → '2025-26'
   */
  static currentFinancialYear(date = new Date()): string {
    const month = date.getMonth(); // 0-indexed, Jan=0
    const year  = date.getFullYear();
    // April (3) to December (11) = current year start
    const fyStart = month >= 3 ? year : year - 1;
    const fyEnd   = fyStart + 1;
    return `${fyStart}-${String(fyEnd).slice(-2)}`;
  }

  /**
   * Returns the financial year for a given date (YYYY-YY format).
   */
  static financialYearFor(date: Date): string {
    return InvoiceUtils.currentFinancialYear(date);
  }

  // ── GST calculation ────────────────────────────────────────────────────────

  /**
   * Computes GST breakdown for a single line item.
   *
   * @param taxableMinor   Taxable value in minor units (after line discount)
   * @param gstRateBps     Total GST rate in basis points (e.g. 1800 = 18%)
   * @param gstType        Transaction type — determines CGST+SGST vs IGST
   *
   * Rules:
   *   intra_state → CGST = SGST = gstRateBps / 2 each; IGST = 0
   *   inter_state → IGST = gstRateBps; CGST = SGST = 0
   *   exempt      → All zero
   *   zero_rated  → All zero (different from exempt for reporting)
   *   composite   → Single rate; mapped to IGST column; no input credit
   */
  static computeLineGst(
    taxableMinor: number,
    gstRateBps:   number,
    gstType:      GstType,
  ): LineItemGst {
    if (gstType === 'exempt' || gstType === 'zero_rated') {
      return {
        taxableMinor,
        cgstAmountMinor: 0,
        sgstAmountMinor: 0,
        igstAmountMinor: 0,
        totalMinor:      taxableMinor,
      };
    }

    const totalTax = InvoiceUtils.bpsToMinor(taxableMinor, gstRateBps);

    if (gstType === 'intra_state') {
      // CGST + SGST — each is exactly half, rounding remainder to SGST
      const cgst = Math.floor(totalTax / 2);
      const sgst = totalTax - cgst; // absorbs rounding penny
      return {
        taxableMinor,
        cgstAmountMinor: cgst,
        sgstAmountMinor: sgst,
        igstAmountMinor: 0,
        totalMinor:      taxableMinor + cgst + sgst,
      };
    }

    // inter_state or composite → IGST column
    return {
      taxableMinor,
      cgstAmountMinor: 0,
      sgstAmountMinor: 0,
      igstAmountMinor: totalTax,
      totalMinor:      taxableMinor + totalTax,
    };
  }

  /**
   * Computes the full invoice GST breakdown from all line items.
   *
   * @param subtotalMinor       Sum of all line subtotals (qty × unit price)
   * @param invoiceDiscountMinor Invoice-level discount applied before tax
   * @param lineItems           Array of { taxableMinor, gstRateBps }
   * @param gstType             Transaction classification
   * @param cessRateBps         Optional cess rate (0 for most sports services)
   */
  static computeInvoiceGst(params: {
    subtotalMinor:        number;
    invoiceDiscountMinor: number;
    lineItems:            Array<{ taxableMinor: number; gstRateBps: number }>;
    gstType:              GstType;
    cessRateBps?:         number;
  }): GstBreakdown {
    const { subtotalMinor, invoiceDiscountMinor, lineItems, gstType, cessRateBps = 0 } = params;

    const taxableValueMinor = Math.max(0, subtotalMinor - invoiceDiscountMinor);

    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    // If invoice has an invoice-level discount, apportion it across lines by weight
    const lineTotal = lineItems.reduce((s, l) => s + l.taxableMinor, 0);

    for (const item of lineItems) {
      // Apportion invoice discount proportionally to each line
      const apportionedDiscount = lineTotal > 0
        ? Math.round((item.taxableMinor / lineTotal) * invoiceDiscountMinor)
        : 0;
      const effectiveTaxable = Math.max(0, item.taxableMinor - apportionedDiscount);

      const lineGst = InvoiceUtils.computeLineGst(effectiveTaxable, item.gstRateBps, gstType);
      totalCgst += lineGst.cgstAmountMinor;
      totalSgst += lineGst.sgstAmountMinor;
      totalIgst += lineGst.igstAmountMinor;
    }

    const cessAmount   = InvoiceUtils.bpsToMinor(taxableValueMinor, cessRateBps);
    const totalTax     = totalCgst + totalSgst + totalIgst + cessAmount;
    const grandTotal   = taxableValueMinor + totalTax;

    // Header-level effective rates: derived from actual amounts (handles mixed-rate invoices)
    // For intra_state: cgstRateBps = CGST_amount / taxable × 10000 (blended rate)
    // For inter_state: igstRateBps = IGST_amount / taxable × 10000
    const effectiveCgstBps = taxableValueMinor > 0 ? Math.round((totalCgst / taxableValueMinor) * 10_000) : 0;
    const effectiveSgstBps = taxableValueMinor > 0 ? Math.round((totalSgst / taxableValueMinor) * 10_000) : 0;
    const effectiveIgstBps = taxableValueMinor > 0 ? Math.round((totalIgst / taxableValueMinor) * 10_000) : 0;

    return {
      taxableValueMinor,
      cgstRateBps:      gstType === 'intra_state' ? effectiveCgstBps : 0,
      cgstAmountMinor:  totalCgst,
      sgstRateBps:      gstType === 'intra_state' ? effectiveSgstBps : 0,
      sgstAmountMinor:  totalSgst,
      igstRateBps:      gstType !== 'intra_state' ? effectiveIgstBps : 0,
      igstAmountMinor:  totalIgst,
      cessRateBps,
      cessAmountMinor:  cessAmount,
      totalTaxMinor:    totalTax,
      grandTotalMinor:  grandTotal,
    };
  }

  /**
   * Determines the GST type based on supplier and recipient state codes.
   * If both are the same → intra_state (CGST + SGST)
   * If different        → inter_state (IGST)
   * If either is null   → defaults to intra_state (conservative)
   */
  static determineGstType(
    supplierStateCode:  string | null | undefined,
    recipientStateCode: string | null | undefined,
  ): GstType {
    if (!supplierStateCode || !recipientStateCode) return 'intra_state';
    return supplierStateCode === recipientStateCode ? 'intra_state' : 'inter_state';
  }

  /**
   * Validates a GSTIN format.
   * Format: 2-digit state code + 10-char PAN + 1 entity code + 1 'Z' + 1 checksum
   * Total: 15 characters.
   */
  static isValidGstin(gstin: string): boolean {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
  }

  /**
   * Extracts state code from GSTIN (first 2 digits).
   */
  static stateCodeFromGstin(gstin: string): string {
    return gstin.slice(0, 2);
  }

  // ── Minor-unit math ────────────────────────────────────────────────────────

  /**
   * Applies a basis-point rate to a minor-unit amount.
   * Result is floored to the nearest paisa (floor, not round, per GST rules).
   *
   * @param amountMinor  Amount in minor units (paise)
   * @param rateBps      Rate in basis points (e.g. 1800 = 18.00%)
   */
  static bpsToMinor(amountMinor: number, rateBps: number): number {
    if (rateBps === 0) return 0;
    // (amount × rate) / 10000, floored
    return Math.floor((amountMinor * rateBps) / 10_000);
  }

  /**
   * Converts a percentage to basis points.
   * e.g. 18 → 1800, 9 → 900, 5 → 500
   */
  static pctToBps(pct: number): number {
    return Math.round(pct * 100);
  }

  /**
   * Formats a minor-unit amount to a display string.
   * e.g. 150000 → '₹1,500.00'
   */
  static formatAmount(minorUnits: number, currency = 'INR', locale = 'en-IN'): string {
    return new Intl.NumberFormat(locale, {
      style:                 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(minorUnits / 100);
  }

  /**
   * Converts minor units to major units with 2 decimal places.
   * e.g. 150025 → 1500.25
   */
  static toMajorUnits(minorUnits: number): number {
    return Math.round(minorUnits) / 100;
  }

  // ── Amount-in-words (Indian system) ───────────────────────────────────────

  /**
   * Converts a minor-unit amount to Indian-English words.
   * e.g. 150025 → 'Rupees One Thousand Five Hundred and Twenty Five Paise Only'
   */
  static amountInWords(minorUnits: number, currency = 'INR'): string {
    const major = Math.floor(minorUnits / 100);
    const minor = minorUnits % 100;

    const majorWords = InvoiceUtils.numberToWords(major);
    const minorWords = minor > 0 ? ` and ${InvoiceUtils.numberToWords(minor)} Paise` : '';
    const currencyLabel = currency === 'INR' ? 'Rupees' : currency;

    return `${currencyLabel} ${majorWords}${minorWords} Only`;
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  static generateLineItemId(): string {
    return randomBytes(8).toString('hex');
  }

  // ── Private: number-to-words (Indian system) ──────────────────────────────

  private static readonly ONES = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen',
  ];

  private static readonly TENS = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
  ];

  private static numberToWords(n: number): string {
    if (n === 0) return 'Zero';
    if (n < 0)   return `Minus ${InvoiceUtils.numberToWords(-n)}`;

    const parts: string[] = [];

    // Crore (10 million)
    if (n >= 10_000_000) {
      parts.push(`${InvoiceUtils.numberToWords(Math.floor(n / 10_000_000))} Crore`);
      n %= 10_000_000;
    }
    // Lakh (100 thousand)
    if (n >= 100_000) {
      parts.push(`${InvoiceUtils.numberToWords(Math.floor(n / 100_000))} Lakh`);
      n %= 100_000;
    }
    // Thousand
    if (n >= 1_000) {
      parts.push(`${InvoiceUtils.numberToWords(Math.floor(n / 1_000))} Thousand`);
      n %= 1_000;
    }
    // Hundred
    if (n >= 100) {
      parts.push(`${InvoiceUtils.ONES[Math.floor(n / 100)]!} Hundred`);
      n %= 100;
    }
    // Tens + ones
    if (n > 0) {
      if (n < 20) {
        parts.push(InvoiceUtils.ONES[n]!);
      } else {
        const tens = InvoiceUtils.TENS[Math.floor(n / 10)]!;
        const ones = InvoiceUtils.ONES[n % 10]!;
        parts.push(ones ? `${tens} ${ones}` : tens);
      }
    }

    return parts.join(' ');
  }
}
