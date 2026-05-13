import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import type {
  OccupancyQueryDto,
  CourtUtilizationQueryDto,
  PeakHourQueryDto,
  CancellationQueryDto,
  NoShowQueryDto,
} from '../dto/analytics.dto';

const MAX_RANGE_DAYS = 366;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  // ── Occupancy ──────────────────────────────────────────────────────────────

  async getOccupancy(query: OccupancyQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    return this.analyticsRepository.getOccupancy({
      tenantId,
      from:             query.from,
      to:               query.to,
      branchId:         query.branchId,
      courtId:          query.courtId,
      sportId:          query.sportId,
      granularity:      query.granularity ?? 'day',
      includeCancelled: query.includeCancelled ?? false,
    });
  }

  // ── Court utilisation ──────────────────────────────────────────────────────

  async getCourtUtilization(query: CourtUtilizationQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const rows = await this.analyticsRepository.getCourtUtilization({
      tenantId,
      from:      query.from,
      to:        query.to,
      branchId:  query.branchId,
      courtId:   query.courtId,
      sortBy:    query.sortBy ?? 'utilization',
      limit:     query.limit  ?? 50,
    });

    const totalRevenue   = rows.reduce((s, r) => s + r.totalRevenueMinor, 0);
    const totalBookings  = rows.reduce((s, r) => s + r.totalSlotsBooked, 0);
    const avgUtilization = rows.length > 0
      ? Math.round(rows.reduce((s, r) => s + r.utilizationPct, 0) / rows.length * 100) / 100
      : 0;

    return {
      from:               query.from,
      to:                 query.to,
      totalCourts:        rows.length,
      totalRevenueMinor:  totalRevenue,
      totalBookings,
      avgUtilizationPct:  avgUtilization,
      courts:             rows,
    };
  }

  // ── Peak hours ─────────────────────────────────────────────────────────────

  async getPeakHours(query: PeakHourQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const result = await this.analyticsRepository.getPeakHours({
      tenantId,
      from:       query.from,
      to:         query.to,
      branchId:   query.branchId,
      courtId:    query.courtId,
      sportId:    query.sportId,
      dayOfWeek:  query.dayOfWeek,
    });

    return {
      from:          query.from,
      to:            query.to,
      busiestHour:   result.busiestHour,
      busiestHourLabel: `${String(result.busiestHour).padStart(2, '0')}:00`,
      busiestDay:    result.busiestDay,
      quietestHour:  result.quietestHour,
      quietestHourLabel: `${String(result.quietestHour).padStart(2, '0')}:00`,
      byHour:        result.byHour,
      heatmap:       result.heatmap,
    };
  }

  // ── Cancellation analytics ─────────────────────────────────────────────────

  async getCancellationAnalytics(query: CancellationQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    return this.analyticsRepository.getCancellationAnalytics({
      tenantId,
      from:           query.from,
      to:             query.to,
      branchId:       query.branchId,
      courtId:        query.courtId,
      granularity:    query.granularity    ?? 'day',
      groupByReason:  query.groupByReason  ?? true,
    });
  }

  // ── No-show analytics ──────────────────────────────────────────────────────

  async getNoShowAnalytics(query: NoShowQueryDto, tenantId: string) {
    this.validateRange(query.from, query.to);
    const result = await this.analyticsRepository.getNoShowAnalytics({
      tenantId,
      from:               query.from,
      to:                 query.to,
      branchId:           query.branchId,
      courtId:            query.courtId,
      granularity:        query.granularity       ?? 'day',
      riskThresholdPct:   query.riskThresholdPct  ?? 20,
    });

    return {
      ...result,
      highRiskCourts: result.byCourt.filter((c) => c.isHighRisk),
      riskThresholdPct: query.riskThresholdPct ?? 20,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private validateRange(from: string, to: string): void {
    if (from > to) {
      throw new BadRequestException(`from (${from}) must not be after to (${to})`);
    }
    const diffDays = Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / 86_400_000,
    );
    if (diffDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_RANGE_DAYS} days (requested: ${diffDays})`,
      );
    }
  }
}
