import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { TenantGuard }      from '../../invoice/guards/invoice.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { ReportingService } from '../services/reporting.service';
import {
  RevenueSummaryQueryDto,
  GstSummaryQueryDto,
  PaymentModeReportQueryDto,
  BranchRevenueQueryDto,
} from '../dto/reporting.dto';

/**
 * ReportingController
 *
 * All endpoints are tenant-scoped and read-only.
 * RBAC: TENANT_ADMIN, TENANT_MANAGER — enforced at API Gateway level.
 *
 * Routes:
 *   GET /api/v1/reports/revenue          Revenue summary + period breakdown
 *   GET /api/v1/reports/gst              GST summary with CGST/SGST/IGST breakdown
 *   GET /api/v1/reports/payment-modes    Payment method and status breakdown
 *   GET /api/v1/reports/branch-revenue   Per-branch revenue with trend data
 */
@Controller('reports')
@UseGuards(TenantGuard)
@Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'CASHIER', 'REPORT_VIEWER')
@UseInterceptors(AuditInterceptor)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('revenue')
  getRevenueSummary(
    @Query() query: RevenueSummaryQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.reportingService.getRevenueSummary(query, tenant.tenantId);
  }

  @Get('gst')
  getGstSummary(
    @Query() query: GstSummaryQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.reportingService.getGstSummary(query, tenant.tenantId);
  }

  @Get('payment-modes')
  getPaymentModeReport(
    @Query() query: PaymentModeReportQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.reportingService.getPaymentModeReport(query, tenant.tenantId);
  }

  @Get('branch-revenue')
  getBranchRevenueReport(
    @Query() query: BranchRevenueQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.reportingService.getBranchRevenueReport(query, tenant.tenantId);
  }
}
