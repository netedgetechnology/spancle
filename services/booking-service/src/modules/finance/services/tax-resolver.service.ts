import { Injectable, Logger } from '@nestjs/common';
import { TaxRateRepository }  from '../repositories/tax-rate.repository';
import type { TaxRateEntity } from '../entities/tax-rate.entity';

export interface TaxLineInput {
  /** Net amount in minor currency units (before or including tax, depending on is_inclusive). */
  lineAmountMinor: number;
  /** Line type for applies_to filter (e.g. 'court_booking', 'coaching', 'merchandise'). */
  lineType:        string;
  /** Tax rate code to apply. If null, TaxResolver uses jurisdiction-based lookup. */
  taxCode?:        string | null;
}

export interface TaxLineResult {
  taxCode:         string;
  taxName:         string;
  rateBps:         number;
  taxableMinor:    number;   // amount that tax is computed on (exclusive: = lineAmountMinor)
  taxMinor:        number;   // computed tax in minor units (always integer)
  isInclusive:     boolean;
  isCompound:      boolean;
}

export interface TaxResolutionResult {
  totalTaxMinor:   number;
  taxLines:        TaxLineResult[];
}

/**
 * TaxResolver — authoritative tax calculation for Finance Engine.
 *
 * Rules:
 *   - All arithmetic produces INTEGER results. No floats.
 *   - Rounding: Math.trunc() (truncation toward zero) used on each line.
 *     Rounding differences are tracked but NOT auto-posted here — the caller
 *     posts a rounding adjustment line if needed.
 *   - Compound taxes are applied to the result of prior non-compound taxes.
 *   - Inclusive tax extraction: taxMinor = amount × rateBps / (10000 + rateBps)
 *   - Exclusive tax addition: taxMinor = amount × rateBps / 10000
 *
 * Neither Booking nor Membership calls TaxResolver — Finance calls it at
 * invoice creation time based on the event payload's jurisdiction context.
 */
@Injectable()
export class TaxResolver {
  private readonly logger = new Logger(TaxResolver.name);

  constructor(private readonly taxRateRepository: TaxRateRepository) {}

  /**
   * Resolves and computes tax for a single line item.
   *
   * @param tenantId       Tenant scoping
   * @param line           Line item details
   * @param jurisdiction   ISO country + state (e.g. 'IN-MH', 'GB'). null = no jurisdiction filter.
   * @param transactionDate YYYY-MM-DD for rate effective-date matching
   */
  async resolveLine(
    tenantId:        string,
    line:            TaxLineInput,
    jurisdiction:    string | null,
    transactionDate: string,
  ): Promise<TaxResolutionResult> {
    // Integer guard
    if (!Number.isInteger(line.lineAmountMinor)) {
      throw new Error(
        `TaxResolver: lineAmountMinor must be an integer; got ${line.lineAmountMinor}`,
      );
    }

    let applicableRates: TaxRateEntity[] = [];

    if (line.taxCode) {
      // Explicit tax code supplied by caller
      const rate = await this.taxRateRepository.findByCode(line.taxCode, tenantId);
      if (rate && rate.isActive) applicableRates = [rate];
    } else if (jurisdiction) {
      // Jurisdiction-based lookup
      const allRates = await this.taxRateRepository.findForJurisdiction(
        tenantId,
        jurisdiction,
        transactionDate,
      );
      // Filter to those applying to this line type (empty applies_to = all types)
      applicableRates = allRates.filter((r) =>
        !r.appliesTo || r.appliesTo.length === 0 || r.appliesTo.includes(line.lineType),
      );
    } else {
      // Default rate fallback
      const def = await this.taxRateRepository.findDefault(tenantId);
      if (def) applicableRates = [def];
    }

    if (applicableRates.length === 0) {
      return { totalTaxMinor: 0, taxLines: [] };
    }

    const taxLines: TaxLineResult[] = [];
    let baseTaxTotal = 0;   // for compound tax base

    for (const rate of applicableRates) {
      let taxMinor: number;
      let taxableMinor: number;

      if (rate.isCompound) {
        // Compound: applied to the base tax already computed (not to the line amount)
        taxableMinor = baseTaxTotal;
        taxMinor = Math.trunc(taxableMinor * rate.rateBps / 10000);
      } else if (rate.isInclusive) {
        // Inclusive: extract tax from line amount
        // tax = amount × rate / (10000 + rate)
        taxableMinor = line.lineAmountMinor;
        taxMinor = Math.trunc(
          (taxableMinor * rate.rateBps) / (10000 + rate.rateBps),
        );
      } else {
        // Exclusive (default): add tax on top
        // tax = amount × rate / 10000
        taxableMinor = line.lineAmountMinor;
        taxMinor = Math.trunc(taxableMinor * rate.rateBps / 10000);
      }

      baseTaxTotal += taxMinor;

      taxLines.push({
        taxCode:      rate.code,
        taxName:      rate.name,
        rateBps:      rate.rateBps,
        taxableMinor,
        taxMinor,
        isInclusive:  rate.isInclusive,
        isCompound:   rate.isCompound,
      });
    }

    const totalTaxMinor = taxLines.reduce((s, l) => s + l.taxMinor, 0);

    return { totalTaxMinor, taxLines };
  }

  /**
   * Resolves tax for multiple line items in one call.
   * Returns per-line results plus an aggregate total.
   */
  async resolveLines(
    tenantId:        string,
    lines:           TaxLineInput[],
    jurisdiction:    string | null,
    transactionDate: string,
  ): Promise<{ lineResults: TaxResolutionResult[]; grandTotalTaxMinor: number }> {
    const lineResults = await Promise.all(
      lines.map((l) => this.resolveLine(tenantId, l, jurisdiction, transactionDate)),
    );
    const grandTotalTaxMinor = lineResults.reduce(
      (sum, r) => sum + r.totalTaxMinor,
      0,
    );
    return { lineResults, grandTotalTaxMinor };
  }

  /**
   * Returns the display rate percentage for a tax code (for invoice display only).
   * rateBps / 100 = rate as a percentage string with 2 decimal places.
   * Example: rateBps=1800 → '18.00'
   */
  static formatRate(rateBps: number): string {
    return (rateBps / 100).toFixed(2);
  }
}
