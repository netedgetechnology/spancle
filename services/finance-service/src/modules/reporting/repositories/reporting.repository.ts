import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }       from 'typeorm';
import type { Granularity } from '../dto/reporting.dto';

// ── Result types ──────────────────────────────────────────────────────────────

export interface RevenuePeriod {
  period:                  string;
  invoiceCount:            number;
  subtotalMinor:           number;
  discountMinor:           number;
  taxableValueMinor:       number;
  totalTaxMinor:           number;
  grandTotalMinor:         number;
  amountPaidMinor:         number;
  balanceDueMinor:         number;
  paidInvoiceCount:        number;
  overdueInvoiceCount:     number;
  cancelledInvoiceCount:   number;
}

export interface RevenueSummary {
  from:                    string;
  to:                      string;
  totalInvoices:           number;
  totalSubtotalMinor:      number;
  totalDiscountMinor:      number;
  totalTaxableMinor:       number;
  totalTaxMinor:           number;
  totalGrandMinor:         number;
  totalPaidMinor:          number;
  totalOutstandingMinor:   number;
  collectionRate:          number;   // (totalPaidMinor / totalGrandMinor) × 100
  byPeriod:                RevenuePeriod[];
  byType:                  InvoiceTypeBreakdown[];
}

export interface InvoiceTypeBreakdown {
  invoiceType:             string;
  invoiceCount:            number;
  grandTotalMinor:         number;
  amountPaidMinor:         number;
}

export interface GstPeriodRow {
  period:                  string;
  gstType:                 string;
  hsnSacCode:              string | null;
  invoiceCount:            number;
  taxableValueMinor:       number;
  cgstRateBps:             number;
  cgstAmountMinor:         number;
  sgstRateBps:             number;
  sgstAmountMinor:         number;
  igstRateBps:             number;
  igstAmountMinor:         number;
  cessAmountMinor:         number;
  totalTaxMinor:           number;
}

export interface GstSummary {
  from:                    string;
  to:                      string;
  totalTaxableMinor:       number;
  totalCgstMinor:          number;
  totalSgstMinor:          number;
  totalIgstMinor:          number;
  totalCessMinor:          number;
  totalTaxMinor:           number;
  byGstType:               GstTypeBreakdown[];
  byHsnSac:                HsnSacBreakdown[];
  byPeriod:                GstPeriodRow[];
}

export interface GstTypeBreakdown {
  gstType:                 string;
  invoiceCount:            number;
  taxableValueMinor:       number;
  cgstAmountMinor:         number;
  sgstAmountMinor:         number;
  igstAmountMinor:         number;
  totalTaxMinor:           number;
}

export interface HsnSacBreakdown {
  hsnSacCode:              string | null;
  invoiceCount:            number;
  taxableValueMinor:       number;
  totalTaxMinor:           number;
}

export interface PaymentModeRow {
  method:                  string;
  transactionCount:        number;
  totalAmountMinor:        number;
  totalRefundedMinor:      number;
  netAmountMinor:          number;
  totalGatewayFeeMinor:    number;
  settlementRate:          number;   // (settled / total) × 100
}

export interface PaymentModeSummary {
  from:                    string;
  to:                      string;
  totalTransactions:       number;
  totalCollectedMinor:     number;
  totalRefundedMinor:      number;
  netCollectedMinor:       number;
  totalGatewayFeeMinor:    number;
  byMethod:                PaymentModeRow[];
  byStatus:                PaymentStatusRow[];
  dailyTrend:              PaymentDailyTrend[];
}

export interface PaymentStatusRow {
  status:                  string;
  transactionCount:        number;
  totalAmountMinor:        number;
}

export interface PaymentDailyTrend {
  date:                    string;
  transactionCount:        number;
  totalAmountMinor:        number;
}

export interface BranchRevenueRow {
  branchId:                string;
  invoiceCount:            number;
  grandTotalMinor:         number;
  amountPaidMinor:         number;
  balanceDueMinor:         number;
  totalTaxMinor:           number;
  paymentCount:            number;
  netPaymentMinor:         number;
  collectionRate:          number;
}

export interface BranchRevenueTrend {
  period:                  string;
  branchId:                string;
  grandTotalMinor:         number;
  amountPaidMinor:         number;
}

@Injectable()
export class ReportingRepository {
  private readonly logger = new Logger(ReportingRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ── Revenue summary ────────────────────────────────────────────────────────

  async getRevenueSummary(params: {
    tenantId:          string;
    from:              string;
    to:                string;
    branchId?:         string;
    invoiceType?:      string;
    includeCancelled?: boolean;
    granularity?:      Granularity;
  }): Promise<{
    totals: Omit<RevenueSummary, 'byPeriod' | 'byType'>;
    byPeriod: RevenuePeriod[];
    byType: InvoiceTypeBreakdown[];
  }> {
    const { tenantId, from, to, branchId, invoiceType, includeCancelled, granularity = 'month' } = params;

    // Always exclude draft and voided. Optionally exclude cancelled.
    const excludedStatuses = includeCancelled
      ? `'draft','voided'`
      : `'draft','voided','cancelled'`;

    const periodTrunc = this.periodTrunc(granularity, 'issued_at');

    const baseWhere = `
      tenant_id = $1
      AND is_deleted = false
      AND issued_at >= $2::date
      AND issued_at < ($3::date + interval '1 day')
      AND status NOT IN (${excludedStatuses})
      ${branchId   ? `AND branch_id = $4`    : ''}
      ${invoiceType ? `AND type = $5`         : ''}
    `;

    const positionalParams: unknown[] = [tenantId, from, to];
    if (branchId)    positionalParams.push(branchId);
    if (invoiceType) positionalParams.push(invoiceType);

    // Totals
    const totalsRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        COUNT(id)::int                              AS "totalInvoices",
        COALESCE(SUM(subtotal_minor),   0)::bigint  AS "totalSubtotalMinor",
        COALESCE(SUM(discount_minor),   0)::bigint  AS "totalDiscountMinor",
        COALESCE(SUM(taxable_value_minor),0)::bigint AS "totalTaxableMinor",
        COALESCE(SUM(total_tax_minor),  0)::bigint  AS "totalTaxMinor",
        COALESCE(SUM(grand_total_minor),0)::bigint  AS "totalGrandMinor",
        COALESCE(SUM(amount_paid_minor),0)::bigint  AS "totalPaidMinor",
        COALESCE(SUM(balance_due_minor),0)::bigint  AS "totalOutstandingMinor"
      FROM invoices
      WHERE ${baseWhere}
    `, positionalParams);

    const t = totalsRows[0] ?? {} as Record<string, string>;
    const totalGrand = Number(t['totalGrandMinor'] ?? 0);
    const totalPaid  = Number(t['totalPaidMinor']  ?? 0);

    // By period
    const periodRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('${granularity}', issued_at), 'YYYY-MM-DD') AS period,
        COUNT(id)::int                              AS "invoiceCount",
        COALESCE(SUM(subtotal_minor),    0)::bigint AS "subtotalMinor",
        COALESCE(SUM(discount_minor),    0)::bigint AS "discountMinor",
        COALESCE(SUM(taxable_value_minor),0)::bigint AS "taxableValueMinor",
        COALESCE(SUM(total_tax_minor),   0)::bigint AS "totalTaxMinor",
        COALESCE(SUM(grand_total_minor), 0)::bigint AS "grandTotalMinor",
        COALESCE(SUM(amount_paid_minor), 0)::bigint AS "amountPaidMinor",
        COALESCE(SUM(balance_due_minor), 0)::bigint AS "balanceDueMinor",
        COUNT(id) FILTER (WHERE status = 'paid')::int           AS "paidInvoiceCount",
        COUNT(id) FILTER (WHERE status = 'overdue')::int        AS "overdueInvoiceCount",
        COUNT(id) FILTER (WHERE status IN ('cancelled','voided'))::int AS "cancelledInvoiceCount"
      FROM invoices
      WHERE ${baseWhere}
      GROUP BY DATE_TRUNC('${granularity}', issued_at)
      ORDER BY DATE_TRUNC('${granularity}', issued_at)
    `, positionalParams);

    // By invoice type
    const typeRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        type                                         AS "invoiceType",
        COUNT(id)::int                               AS "invoiceCount",
        COALESCE(SUM(grand_total_minor), 0)::bigint  AS "grandTotalMinor",
        COALESCE(SUM(amount_paid_minor), 0)::bigint  AS "amountPaidMinor"
      FROM invoices
      WHERE ${baseWhere}
      GROUP BY type
      ORDER BY SUM(grand_total_minor) DESC NULLS LAST
    `, positionalParams);

    return {
      totals: {
        from, to,
        totalInvoices:          Number(t['totalInvoices'] ?? 0),
        totalSubtotalMinor:     Number(t['totalSubtotalMinor'] ?? 0),
        totalDiscountMinor:     Number(t['totalDiscountMinor'] ?? 0),
        totalTaxableMinor:      Number(t['totalTaxableMinor'] ?? 0),
        totalTaxMinor:          Number(t['totalTaxMinor'] ?? 0),
        totalGrandMinor:        totalGrand,
        totalPaidMinor:         totalPaid,
        totalOutstandingMinor:  Number(t['totalOutstandingMinor'] ?? 0),
        collectionRate:         totalGrand > 0 ? Math.round((totalPaid / totalGrand) * 10000) / 100 : 0,
      },
      byPeriod: periodRows.map((r) => ({
        period:                r['period'] ?? '',
        invoiceCount:          Number(r['invoiceCount'] ?? 0),
        subtotalMinor:         Number(r['subtotalMinor'] ?? 0),
        discountMinor:         Number(r['discountMinor'] ?? 0),
        taxableValueMinor:     Number(r['taxableValueMinor'] ?? 0),
        totalTaxMinor:         Number(r['totalTaxMinor'] ?? 0),
        grandTotalMinor:       Number(r['grandTotalMinor'] ?? 0),
        amountPaidMinor:       Number(r['amountPaidMinor'] ?? 0),
        balanceDueMinor:       Number(r['balanceDueMinor'] ?? 0),
        paidInvoiceCount:      Number(r['paidInvoiceCount'] ?? 0),
        overdueInvoiceCount:   Number(r['overdueInvoiceCount'] ?? 0),
        cancelledInvoiceCount: Number(r['cancelledInvoiceCount'] ?? 0),
      })),
      byType: typeRows.map((r) => ({
        invoiceType:    r['invoiceType'] ?? '',
        invoiceCount:   Number(r['invoiceCount'] ?? 0),
        grandTotalMinor: Number(r['grandTotalMinor'] ?? 0),
        amountPaidMinor: Number(r['amountPaidMinor'] ?? 0),
      })),
    };
  }

  // ── GST summary ────────────────────────────────────────────────────────────

  async getGstSummary(params: {
    tenantId:       string;
    from:           string;
    to:             string;
    branchId?:      string;
    gstType?:       string;
    hsnSacCode?:    string;
    financialYear?: string;
    granularity?:   Granularity;
  }): Promise<{
    totals:    Omit<GstSummary, 'byGstType' | 'byHsnSac' | 'byPeriod'>;
    byGstType: GstTypeBreakdown[];
    byHsnSac:  HsnSacBreakdown[];
    byPeriod:  GstPeriodRow[];
  }> {
    const { tenantId, from, to, branchId, gstType, hsnSacCode, financialYear, granularity = 'month' } = params;

    // Financial year overrides from/to
    let effectiveFrom = from;
    let effectiveTo   = to;
    if (financialYear) {
      const [startYear] = financialYear.split('-');
      const yr = parseInt(startYear!, 10);
      effectiveFrom = `${yr}-04-01`;
      effectiveTo   = `${yr + 1}-03-31`;
    }

    const positionalParams: unknown[] = [tenantId, effectiveFrom, effectiveTo];
    let paramIdx = 4;

    const extra: string[] = [];
    if (branchId)   { extra.push(`AND branch_id = $${paramIdx++}`);    positionalParams.push(branchId);   }
    if (gstType)    { extra.push(`AND gst_type = $${paramIdx++}`);     positionalParams.push(gstType);    }
    if (hsnSacCode) { extra.push(`AND hsn_sac_code = $${paramIdx++}`); positionalParams.push(hsnSacCode); }

    const baseWhere = `
      tenant_id = $1
      AND is_deleted = false
      AND status NOT IN ('voided','cancelled','draft')
      AND issued_at >= $2::date
      AND issued_at < ($3::date + interval '1 day')
      ${extra.join('\n')}
    `;

    const totalsRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        COALESCE(SUM(taxable_value_minor), 0)::bigint AS "totalTaxableMinor",
        COALESCE(SUM(cgst_amount_minor),   0)::bigint AS "totalCgstMinor",
        COALESCE(SUM(sgst_amount_minor),   0)::bigint AS "totalSgstMinor",
        COALESCE(SUM(igst_amount_minor),   0)::bigint AS "totalIgstMinor",
        COALESCE(SUM(cess_amount_minor),   0)::bigint AS "totalCessMinor",
        COALESCE(SUM(total_tax_minor),     0)::bigint AS "totalTaxMinor"
      FROM invoices WHERE ${baseWhere}
    `, positionalParams);

    const byTypeRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        gst_type                                        AS "gstType",
        COUNT(id)::int                                  AS "invoiceCount",
        COALESCE(SUM(taxable_value_minor), 0)::bigint   AS "taxableValueMinor",
        COALESCE(SUM(cgst_amount_minor),   0)::bigint   AS "cgstAmountMinor",
        COALESCE(SUM(sgst_amount_minor),   0)::bigint   AS "sgstAmountMinor",
        COALESCE(SUM(igst_amount_minor),   0)::bigint   AS "igstAmountMinor",
        COALESCE(SUM(total_tax_minor),     0)::bigint   AS "totalTaxMinor"
      FROM invoices WHERE ${baseWhere}
      GROUP BY gst_type
      ORDER BY SUM(total_tax_minor) DESC NULLS LAST
    `, positionalParams);

    const byHsnRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        hsn_sac_code                                    AS "hsnSacCode",
        COUNT(id)::int                                  AS "invoiceCount",
        COALESCE(SUM(taxable_value_minor), 0)::bigint   AS "taxableValueMinor",
        COALESCE(SUM(total_tax_minor),     0)::bigint   AS "totalTaxMinor"
      FROM invoices WHERE ${baseWhere}
      GROUP BY hsn_sac_code
      ORDER BY SUM(total_tax_minor) DESC NULLS LAST
    `, positionalParams);

    const byPeriodRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('${granularity}', issued_at), 'YYYY-MM-DD') AS period,
        gst_type                                        AS "gstType",
        hsn_sac_code                                    AS "hsnSacCode",
        COUNT(id)::int                                  AS "invoiceCount",
        COALESCE(SUM(taxable_value_minor), 0)::bigint   AS "taxableValueMinor",
        MAX(cgst_rate_bps)::int                         AS "cgstRateBps",
        COALESCE(SUM(cgst_amount_minor),   0)::bigint   AS "cgstAmountMinor",
        MAX(sgst_rate_bps)::int                         AS "sgstRateBps",
        COALESCE(SUM(sgst_amount_minor),   0)::bigint   AS "sgstAmountMinor",
        MAX(igst_rate_bps)::int                         AS "igstRateBps",
        COALESCE(SUM(igst_amount_minor),   0)::bigint   AS "igstAmountMinor",
        COALESCE(SUM(cess_amount_minor),   0)::bigint   AS "cessAmountMinor",
        COALESCE(SUM(total_tax_minor),     0)::bigint   AS "totalTaxMinor"
      FROM invoices WHERE ${baseWhere}
      GROUP BY DATE_TRUNC('${granularity}', issued_at), gst_type, hsn_sac_code
      ORDER BY DATE_TRUNC('${granularity}', issued_at), gst_type
    `, positionalParams);

    const t = totalsRows[0] ?? {} as Record<string, string>;

    return {
      totals: {
        from: effectiveFrom, to: effectiveTo,
        totalTaxableMinor: Number(t['totalTaxableMinor'] ?? 0),
        totalCgstMinor:    Number(t['totalCgstMinor']    ?? 0),
        totalSgstMinor:    Number(t['totalSgstMinor']    ?? 0),
        totalIgstMinor:    Number(t['totalIgstMinor']    ?? 0),
        totalCessMinor:    Number(t['totalCessMinor']    ?? 0),
        totalTaxMinor:     Number(t['totalTaxMinor']     ?? 0),
      },
      byGstType: byTypeRows.map((r) => ({
        gstType:           r['gstType']           ?? '',
        invoiceCount:      Number(r['invoiceCount']      ?? 0),
        taxableValueMinor: Number(r['taxableValueMinor'] ?? 0),
        cgstAmountMinor:   Number(r['cgstAmountMinor']   ?? 0),
        sgstAmountMinor:   Number(r['sgstAmountMinor']   ?? 0),
        igstAmountMinor:   Number(r['igstAmountMinor']   ?? 0),
        totalTaxMinor:     Number(r['totalTaxMinor']     ?? 0),
      })),
      byHsnSac: byHsnRows.map((r) => ({
        hsnSacCode:        r['hsnSacCode']        ?? null,
        invoiceCount:      Number(r['invoiceCount']      ?? 0),
        taxableValueMinor: Number(r['taxableValueMinor'] ?? 0),
        totalTaxMinor:     Number(r['totalTaxMinor']     ?? 0),
      })),
      byPeriod: byPeriodRows.map((r) => ({
        period:            r['period']            ?? '',
        gstType:           r['gstType']           ?? '',
        hsnSacCode:        r['hsnSacCode']        ?? null,
        invoiceCount:      Number(r['invoiceCount']      ?? 0),
        taxableValueMinor: Number(r['taxableValueMinor'] ?? 0),
        cgstRateBps:       Number(r['cgstRateBps']       ?? 0),
        cgstAmountMinor:   Number(r['cgstAmountMinor']   ?? 0),
        sgstRateBps:       Number(r['sgstRateBps']       ?? 0),
        sgstAmountMinor:   Number(r['sgstAmountMinor']   ?? 0),
        igstRateBps:       Number(r['igstRateBps']       ?? 0),
        igstAmountMinor:   Number(r['igstAmountMinor']   ?? 0),
        cessAmountMinor:   Number(r['cessAmountMinor']   ?? 0),
        totalTaxMinor:     Number(r['totalTaxMinor']     ?? 0),
      })),
    };
  }

  // ── Payment mode report ────────────────────────────────────────────────────

  async getPaymentModeReport(params: {
    tenantId:             string;
    from:                 string;
    to:                   string;
    branchId?:            string;
    method?:              string;
    status?:              string;
    includeUnsuccessful?: boolean;
  }): Promise<{
    totals:     Omit<PaymentModeSummary, 'byMethod' | 'byStatus' | 'dailyTrend'>;
    byMethod:   PaymentModeRow[];
    byStatus:   PaymentStatusRow[];
    dailyTrend: PaymentDailyTrend[];
  }> {
    const { tenantId, from, to, branchId, method, status, includeUnsuccessful } = params;

    const positionalParams: unknown[] = [tenantId, from, to];
    let paramIdx = 4;
    const extra: string[] = [];

    if (branchId) { extra.push(`AND branch_id = $${paramIdx++}`); positionalParams.push(branchId); }
    if (method)   { extra.push(`AND method = $${paramIdx++}`);    positionalParams.push(method);   }
    if (status)   { extra.push(`AND status = $${paramIdx++}`);    positionalParams.push(status);   }

    const successFilter = includeUnsuccessful
      ? ''
      : `AND status IN ('captured','settled')`;

    const baseWhere = `
      tenant_id = $1
      AND is_deleted = false
      AND created_at >= $2::date
      AND created_at < ($3::date + interval '1 day')
      ${extra.join('\n')}
    `;

    const settledWhere = `${baseWhere} ${successFilter}`;

    const totalsRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        COUNT(id)::int                                   AS "totalTransactions",
        COALESCE(SUM(amount_minor),           0)::bigint AS "totalCollectedMinor",
        COALESCE(SUM(amount_refunded_minor),  0)::bigint AS "totalRefundedMinor",
        COALESCE(SUM(net_amount_minor),       0)::bigint AS "netCollectedMinor",
        COALESCE(SUM(gateway_fee_minor),      0)::bigint AS "totalGatewayFeeMinor"
      FROM payments WHERE ${settledWhere}
    `, positionalParams);

    const byMethodRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        method,
        COUNT(id)::int                                              AS "transactionCount",
        COALESCE(SUM(amount_minor),           0)::bigint            AS "totalAmountMinor",
        COALESCE(SUM(amount_refunded_minor),  0)::bigint            AS "totalRefundedMinor",
        COALESCE(SUM(net_amount_minor),       0)::bigint            AS "netAmountMinor",
        COALESCE(SUM(gateway_fee_minor),      0)::bigint            AS "totalGatewayFeeMinor",
        ROUND(
          100.0 * COUNT(id) FILTER (WHERE status = 'settled') / NULLIF(COUNT(id), 0), 2
        )::float                                                    AS "settlementRate"
      FROM payments WHERE ${baseWhere}
      GROUP BY method
      ORDER BY SUM(amount_minor) DESC NULLS LAST
    `, positionalParams);

    const byStatusRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        status,
        COUNT(id)::int                                   AS "transactionCount",
        COALESCE(SUM(amount_minor), 0)::bigint           AS "totalAmountMinor"
      FROM payments WHERE ${baseWhere}
      GROUP BY status
      ORDER BY COUNT(id) DESC
    `, positionalParams);

    const dailyRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('day', created_at), 'YYYY-MM-DD') AS date,
        COUNT(id)::int                                        AS "transactionCount",
        COALESCE(SUM(amount_minor), 0)::bigint                AS "totalAmountMinor"
      FROM payments WHERE ${settledWhere}
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at)
    `, positionalParams);

    const t = totalsRows[0] ?? {} as Record<string, string>;

    return {
      totals: {
        from, to,
        totalTransactions:    Number(t['totalTransactions']   ?? 0),
        totalCollectedMinor:  Number(t['totalCollectedMinor'] ?? 0),
        totalRefundedMinor:   Number(t['totalRefundedMinor']  ?? 0),
        netCollectedMinor:    Number(t['netCollectedMinor']   ?? 0),
        totalGatewayFeeMinor: Number(t['totalGatewayFeeMinor'] ?? 0),
      },
      byMethod: byMethodRows.map((r) => ({
        method:               r['method']               ?? '',
        transactionCount:     Number(r['transactionCount']    ?? 0),
        totalAmountMinor:     Number(r['totalAmountMinor']    ?? 0),
        totalRefundedMinor:   Number(r['totalRefundedMinor']  ?? 0),
        netAmountMinor:       Number(r['netAmountMinor']      ?? 0),
        totalGatewayFeeMinor: Number(r['totalGatewayFeeMinor'] ?? 0),
        settlementRate:       Number(r['settlementRate']      ?? 0),
      })),
      byStatus: byStatusRows.map((r) => ({
        status:           r['status']           ?? '',
        transactionCount: Number(r['transactionCount'] ?? 0),
        totalAmountMinor: Number(r['totalAmountMinor'] ?? 0),
      })),
      dailyTrend: dailyRows.map((r) => ({
        date:             r['date']             ?? '',
        transactionCount: Number(r['transactionCount'] ?? 0),
        totalAmountMinor: Number(r['totalAmountMinor'] ?? 0),
      })),
    };
  }

  // ── Branch revenue report ──────────────────────────────────────────────────

  async getBranchRevenueReport(params: {
    tenantId:    string;
    from:        string;
    to:          string;
    branchId?:   string;
    granularity?: Granularity;
    sortBy?:     'revenue' | 'invoices' | 'payments';
    limit?:      number;
  }): Promise<{
    byBranch: BranchRevenueRow[];
    trend:    BranchRevenueTrend[];
  }> {
    const { tenantId, from, to, branchId, granularity = 'month', sortBy = 'revenue', limit = 20 } = params;

    const positionalParams: unknown[] = [tenantId, from, to];
    const branchFilter = branchId
      ? `AND i.branch_id = $4`
      : '';
    if (branchId) positionalParams.push(branchId);

    const sortColumn = sortBy === 'invoices'
      ? 'COUNT(i.id)'
      : sortBy === 'payments'
      ? 'COALESCE(SUM(p.net_amount_minor), 0)'
      : 'COALESCE(SUM(i.grand_total_minor), 0)';

    const byBranchRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        i.branch_id                                                    AS "branchId",
        COUNT(DISTINCT i.id)::int                                       AS "invoiceCount",
        COALESCE(SUM(i.grand_total_minor),  0)::bigint                  AS "grandTotalMinor",
        COALESCE(SUM(i.amount_paid_minor),  0)::bigint                  AS "amountPaidMinor",
        COALESCE(SUM(i.balance_due_minor),  0)::bigint                  AS "balanceDueMinor",
        COALESCE(SUM(i.total_tax_minor),    0)::bigint                  AS "totalTaxMinor",
        COUNT(DISTINCT p.id)::int                                       AS "paymentCount",
        COALESCE(SUM(p.net_amount_minor),   0)::bigint                  AS "netPaymentMinor",
        ROUND(
          100.0 * COALESCE(SUM(i.amount_paid_minor),0)
          / NULLIF(SUM(i.grand_total_minor), 0), 2
        )::float                                                        AS "collectionRate"
      FROM invoices i
      LEFT JOIN payments p
        ON p.invoice_id = i.id
        AND p.tenant_id = i.tenant_id
        AND p.is_deleted = false
        AND p.status IN ('captured','settled')
      WHERE i.tenant_id = $1
        AND i.is_deleted = false
        AND i.status NOT IN ('voided','cancelled','draft')
        AND i.issued_at >= $2::date
        AND i.issued_at < ($3::date + interval '1 day')
        ${branchFilter}
      GROUP BY i.branch_id
      ORDER BY ${sortColumn} DESC NULLS LAST
      LIMIT ${limit}
    `, positionalParams);

    const trendRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('${granularity}', issued_at), 'YYYY-MM-DD') AS period,
        branch_id                                                       AS "branchId",
        COALESCE(SUM(grand_total_minor),  0)::bigint                    AS "grandTotalMinor",
        COALESCE(SUM(amount_paid_minor),  0)::bigint                    AS "amountPaidMinor"
      FROM invoices
      WHERE tenant_id = $1
        AND is_deleted = false
        AND status NOT IN ('voided','cancelled','draft')
        AND issued_at >= $2::date
        AND issued_at < ($3::date + interval '1 day')
        ${branchFilter}
      GROUP BY DATE_TRUNC('${granularity}', issued_at), branch_id
      ORDER BY DATE_TRUNC('${granularity}', issued_at), branch_id
    `, positionalParams);

    return {
      byBranch: byBranchRows.map((r) => ({
        branchId:        r['branchId']        ?? '',
        invoiceCount:    Number(r['invoiceCount']    ?? 0),
        grandTotalMinor: Number(r['grandTotalMinor'] ?? 0),
        amountPaidMinor: Number(r['amountPaidMinor'] ?? 0),
        balanceDueMinor: Number(r['balanceDueMinor'] ?? 0),
        totalTaxMinor:   Number(r['totalTaxMinor']   ?? 0),
        paymentCount:    Number(r['paymentCount']    ?? 0),
        netPaymentMinor: Number(r['netPaymentMinor'] ?? 0),
        collectionRate:  Number(r['collectionRate']  ?? 0),
      })),
      trend: trendRows.map((r) => ({
        period:          r['period']          ?? '',
        branchId:        r['branchId']        ?? '',
        grandTotalMinor: Number(r['grandTotalMinor'] ?? 0),
        amountPaidMinor: Number(r['amountPaidMinor'] ?? 0),
      })),
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private periodTrunc(granularity: Granularity, column: string): string {
    return `TO_CHAR(DATE_TRUNC('${granularity}', ${column}), 'YYYY-MM-DD')`;
  }
}
