import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }      from '../../report/guards/report.guard';
import { Roles }            from '../../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { AnalyticsService } from '../services/analytics.service';
import {
  OccupancyQueryDto,
  CourtUtilizationQueryDto,
  PeakHourQueryDto,
  CancellationQueryDto,
  NoShowQueryDto,
  RevenueBySportQueryDto,
  RevenueByBranchQueryDto,
  BookingTrendsQueryDto,
  CustomerSummaryQueryDto,
  MembershipUsageQueryDto,
  ExportQueryDto,
} from '../dto/analytics.dto';

/**
 * AnalyticsController — occupancy and booking behaviour analytics.
 *
 * Routes:
 *   GET /api/v1/analytics/occupancy          Slot occupancy by period + court
 *   GET /api/v1/analytics/court-utilization  Per-court utilisation league table
 *   GET /api/v1/analytics/peak-hours         Hour × day heatmap of demand
 *   GET /api/v1/analytics/cancellations      Cancellation trend, reasons, courts
 *   GET /api/v1/analytics/no-shows           No-show trend, high-risk courts, DOW
 */
@Controller('analytics')
@UseGuards(TenantGuard)
@Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER', 'REPORT_VIEWER')
@UseInterceptors(AuditInterceptor)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('occupancy')
  getOccupancy(
    @Query() query: OccupancyQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getOccupancy(query, tenant.tenantId);
  }

  @Get('court-utilization')
  getCourtUtilization(
    @Query() query: CourtUtilizationQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getCourtUtilization(query, tenant.tenantId);
  }

  @Get('peak-hours')
  getPeakHours(
    @Query() query: PeakHourQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getPeakHours(query, tenant.tenantId);
  }

  @Get('cancellations')
  getCancellations(
    @Query() query: CancellationQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getCancellationAnalytics(query, tenant.tenantId);
  }

  @Get('no-shows')
  getNoShows(
    @Query() query: NoShowQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getNoShowAnalytics(query, tenant.tenantId);
  }

  @Get('revenue-by-sport')
  getRevenueBySport(
    @Query() query: RevenueBySportQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getRevenueBySport(query, tenant.tenantId);
  }

  @Get('revenue-by-branch')
  getRevenueByBranch(
    @Query() query: RevenueByBranchQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getRevenueByBranch(query, tenant.tenantId);
  }

  @Get('booking-trends')
  getBookingTrends(
    @Query() query: BookingTrendsQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getBookingTrends(query, tenant.tenantId);
  }

  @Get('customer-summary')
  getCustomerSummary(
    @Query() query: CustomerSummaryQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getCustomerSummary(query, tenant.tenantId);
  }

  @Get('membership-usage')
  getMembershipUsage(
    @Query() query: MembershipUsageQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.analyticsService.getMembershipUsage(query, tenant.tenantId);
  }

  /**
   * GET /api/v1/analytics/export
   *
   * Exports any report as CSV or XLSX.
   * Query params: report, format (csv|xlsx), from, to, branchId?, sportId?, courtId?, granularity?
   * Response: file download with appropriate Content-Disposition header.
   */
  @Get('export')
  async exportReport(
    @Query() query: ExportQueryDto,
    @TenantCtx() tenant: TenantContext,
    @Res() res: Response,
  ): Promise<void> {
    const { filename, contentType, buffer } =
      await this.analyticsService.exportReport(query, tenant.tenantId);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
