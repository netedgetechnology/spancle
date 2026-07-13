import {
  Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }           from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext }   from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                  from '../../booking/guards/booking.guard';
import { Roles }                                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                        from '../../../common/interceptors/audit.interceptor';
import { RefundService }                           from '../services/refund.service';
import { PrepareRefundDto, CompleteRefundDto, RejectRefundDto } from '../dto/refund.dto';
import type { RefundStatus }                       from '../entities/refund.entity';

@Controller('finance/admin/refunds')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class RefundAdminController {
  constructor(private readonly refundService: RefundService) {}

  /**
   * POST /finance/admin/refunds
   * Synchronous facade: Phase A + gateway + Phase C in one request.
   * Use for cash/manual and synchronous gateway refunds.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  requestRefund(
    @Body() dto: PrepareRefundDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.refundService.requestRefund(dto, tenant.tenantId, actor.actorId);
  }

  /**
   * POST /finance/admin/refunds/prepare
   * Phase A only: creates the pending row and reserves capacity.
   * Use for async gateway flows (Phase B + C happen via webhook/admin).
   */
  @Post('prepare')
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  prepare(
    @Body() dto: PrepareRefundDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.refundService.prepareRefund(dto, tenant.tenantId, actor.actorId);
  }

  /** GET /finance/admin/refunds */
  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('status')  status?: RefundStatus,
    @Query('limit',  new DefaultValuePipe(50), ParseIntPipe) limit  = 50,
    @Query('offset', new DefaultValuePipe(0),  ParseIntPipe) offset = 0,
  ): Promise<unknown[]> {
    return this.refundService.findAll(tenant.tenantId, { status, limit, offset });
  }

  /** GET /finance/admin/refunds/:id */
  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.refundService.findById(id, tenant.tenantId);
  }

  /** GET /finance/admin/refunds/invoice/:invoiceId */
  @Get('invoice/:invoiceId')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByInvoice(
    @Param('invoiceId', ParseUUIDPipe) invoiceId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.refundService.findByInvoice(invoiceId, tenant.tenantId);
  }

  /** GET /finance/admin/refunds/payment/:paymentId */
  @Get('payment/:paymentId')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.refundService.findByPayment(paymentId, tenant.tenantId);
  }

  /** PATCH /finance/admin/refunds/:id/complete — Phase C2 */
  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteRefundDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.refundService.completeRefund(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /finance/admin/refunds/:id/reject — Phase D */
  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRefundDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.refundService.rejectRefund(id, dto, tenant.tenantId, actor.actorId);
  }
}
