import { Injectable, Logger } from '@nestjs/common';
import { ReportingRepository } from '../repositories/reporting.repository';
import { InvoiceUtils }        from '../../invoice/utils/invoice.utils';
import type {
  RevenueSummaryQueryDto,
  GstSummaryQueryDto,
  PaymentModeReportQueryDto,
  BranchRevenueQueryDto,
} from '../dto/reporting.dto';

@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    private readonly reportingRepository: ReportingRepository,
  ) {}

  // ── Revenue summary ────────────────────────────────────────────────────────

  async getRevenueSummary(
    query:    RevenueSummaryQueryDto,
    tenantId: string,
  ) {
    this.assertDateRange(query.from, query.to);

    const result = await this.reportingRepository.getRevenueSummary({
      tenantId,
      from:              query.from,
      to:                query.to,
      branchId:          query.branchId,
      invoiceType:       query.invoiceType,
      includeCancelled:  query.includeCancelled ?? false,
      granularity:       query.granularity ?? 'month',
    });

    return {
      ...result.totals,
      collectionRateFormatted: `${result.totals.collectionRate}%`,
      grandTotalFormatted:     InvoiceUtils.formatAmount(result.totals.totalGrandMinor),
      paidFormatted:           InvoiceUtils.formatAmount(result.totals.totalPaidMinor),
      outstandingFormatted:    InvoiceUtils.formatAmount(result.totals.totalOutstandingMinor),
      byPeriod:                result.byPeriod,
      byType:                  result.byType,
    };
  }

  // ── GST summary ────────────────────────────────────────────────────────────

  async getGstSummary(
    query:    GstSummaryQueryDto,
    tenantId: string,
  ) {
    // Resolve financial year to date range if provided
    let effectiveFrom = query.from;
    let effectiveTo   = query.to;

    if (query.financialYear) {
      const [startYearStr] = query.financialYear.split('-');
      const startYear      = parseInt(startYearStr!, 10);
      effectiveFrom        = `${startYear}-04-01`;
      effectiveTo          = `${startYear + 1}-03-31`;
    } else {
      this.assertDateRange(query.from, query.to);
    }

    const result = await this.reportingRepository.getGstSummary({
      tenantId,
      from:          effectiveFrom,
      to:            effectiveTo,
      branchId:      query.branchId,
      gstType:       query.gstType,
      hsnSacCode:    query.hsnSacCode,
      financialYear: query.financialYear,
      granularity:   query.granularity ?? 'month',
    });

    const t = result.totals;

    return {
      ...t,
      financialYear:            query.financialYear ?? InvoiceUtils.currentFinancialYear(),
      totalTaxableFormatted:    InvoiceUtils.formatAmount(t.totalTaxableMinor),
      totalCgstFormatted:       InvoiceUtils.formatAmount(t.totalCgstMinor),
      totalSgstFormatted:       InvoiceUtils.formatAmount(t.totalSgstMinor),
      totalIgstFormatted:       InvoiceUtils.formatAmount(t.totalIgstMinor),
      totalCessFormatted:       InvoiceUtils.formatAmount(t.totalCessMinor),
      totalTaxFormatted:        InvoiceUtils.formatAmount(t.totalTaxMinor),
      // GSTR-1 helper: separate intra vs inter
      gstr1Ready: {
        intraStateTaxableMinor:  result.byGstType.find((g) => g.gstType === 'intra_state')?.taxableValueMinor ?? 0,
        intraCgstMinor:          result.byGstType.find((g) => g.gstType === 'intra_state')?.cgstAmountMinor   ?? 0,
        intraSgstMinor:          result.byGstType.find((g) => g.gstType === 'intra_state')?.sgstAmountMinor   ?? 0,
        interStateTaxableMinor:  result.byGstType.find((g) => g.gstType === 'inter_state')?.taxableValueMinor ?? 0,
        interIgstMinor:          result.byGstType.find((g) => g.gstType === 'inter_state')?.igstAmountMinor   ?? 0,
        exemptMinor:             result.byGstType.find((g) => g.gstType === 'exempt')?.taxableValueMinor      ?? 0,
      },
      byGstType: result.byGstType,
      byHsnSac:  result.byHsnSac,
      byPeriod:  result.byPeriod,
    };
  }

  // ── Payment mode report ────────────────────────────────────────────────────

  async getPaymentModeReport(
    query:    PaymentModeReportQueryDto,
    tenantId: string,
  ) {
    this.assertDateRange(query.from, query.to);

    const result = await this.reportingRepository.getPaymentModeReport({
      tenantId,
      from:                 query.from,
      to:                   query.to,
      branchId:             query.branchId,
      method:               query.method,
      status:               query.status,
      includeUnsuccessful:  query.includeUnsuccessful ?? false,
    });

    const t = result.totals;

    return {
      ...t,
      totalCollectedFormatted:  InvoiceUtils.formatAmount(t.totalCollectedMinor),
      totalRefundedFormatted:   InvoiceUtils.formatAmount(t.totalRefundedMinor),
      netCollectedFormatted:    InvoiceUtils.formatAmount(t.netCollectedMinor),
      gatewayFeeFormatted:      InvoiceUtils.formatAmount(t.totalGatewayFeeMinor),
      // Method share percentages
      byMethod: result.byMethod.map((m) => ({
        ...m,
        sharePercent:         t.totalCollectedMinor > 0
          ? Math.round((m.totalAmountMinor / t.totalCollectedMinor) * 10000) / 100
          : 0,
        totalAmountFormatted: InvoiceUtils.formatAmount(m.totalAmountMinor),
        netAmountFormatted:   InvoiceUtils.formatAmount(m.netAmountMinor),
      })),
      byStatus:   result.byStatus,
      dailyTrend: result.dailyTrend,
    };
  }

  // ── Branch revenue ─────────────────────────────────────────────────────────

  async getBranchRevenueReport(
    query:    BranchRevenueQueryDto,
    tenantId: string,
  ) {
    this.assertDateRange(query.from, query.to);

    const result = await this.reportingRepository.getBranchRevenueReport({
      tenantId,
      from:        query.from,
      to:          query.to,
      branchId:    query.branchId,
      granularity: query.granularity ?? 'month',
      sortBy:      query.sortBy      ?? 'revenue',
      limit:       query.limit       ?? 20,
    });

    return {
      from:  query.from,
      to:    query.to,
      byBranch: result.byBranch.map((b) => ({
        ...b,
        grandTotalFormatted:  InvoiceUtils.formatAmount(b.grandTotalMinor),
        amountPaidFormatted:  InvoiceUtils.formatAmount(b.amountPaidMinor),
        balanceDueFormatted:  InvoiceUtils.formatAmount(b.balanceDueMinor),
        collectionRateFormatted: `${b.collectionRate}%`,
      })),
      trend: result.trend,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private assertDateRange(from: string, to: string): void {
    if (from > to) {
      throw new Error(`from (${from}) must not be after to (${to})`);
    }
    const maxDays = 366;
    const diffMs  = new Date(to).getTime() - new Date(from).getTime();
    if (diffMs / 86_400_000 > maxDays) {
      throw new Error(`Date range cannot exceed ${maxDays} days`);
    }
  }
}
