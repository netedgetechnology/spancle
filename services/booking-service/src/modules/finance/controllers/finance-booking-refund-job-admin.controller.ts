import {
  Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }         from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                from '../../booking/guards/booking.guard';
import { Roles }                                 from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                      from '../../../common/interceptors/audit.interceptor';
import { FinanceBookingRefundJobService }        from '../services/finance-booking-refund-job.service';

@Controller('finance/admin/booking-refund-jobs')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class FinanceBookingRefundJobAdminController {
  constructor(private readonly jobService: FinanceBookingRefundJobService) {}

  /** GET /api/v1/finance/admin/booking-refund-jobs/:id */
  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.jobService.findById(id, tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/booking-refund-jobs/by-booking-refund/:bookingRefundId */
  @Get('by-booking-refund/:bookingRefundId')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByBookingRefund(
    @Param('bookingRefundId', ParseUUIDPipe) bookingRefundId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.jobService.findByBookingRefundId(bookingRefundId, tenant.tenantId);
  }

  /**
   * POST /api/v1/finance/admin/booking-refund-jobs/:id/retry
   * Manually triggers processJob() for a pending/retry/stale-processing job.
   *
   * Throws 409 Conflict if the job is CURRENTLY processing (fresh lease).
   * The admin cannot bypass the processing lease — this prevents concurrent
   * double-execution.
   *
   * TENANT_ADMIN only.
   */
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  retry(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() _actor: BookingActorContext,
  ): Promise<unknown> {
    return this.jobService.processJob(id, tenant.tenantId, 'admin');
  }
}
