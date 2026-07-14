import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }         from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                from '../../booking/guards/booking.guard';
import { Roles }                                 from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                      from '../../../common/interceptors/audit.interceptor';
import { PaymentCorrelationService }             from '../services/payment-correlation.service';
import { CreatePaymentCorrelationDto }           from '../dto/payment-correlation.dto';

/**
 * PaymentCorrelationAdminController
 *
 * Manages explicit Booking Payment ↔ Finance Payment correlation records.
 *
 * Route: /finance/admin/payment-correlations
 * Guards: TenantGuard + RbacGuard (TENANT_ADMIN only — correlation is an admin-only operation)
 */
@Controller('finance/admin/payment-correlations')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class PaymentCorrelationAdminController {
  constructor(private readonly correlationService: PaymentCorrelationService) {}

  /**
   * POST /api/v1/finance/admin/payment-correlations
   * Create or return an explicit Booking ↔ Finance payment correlation.
   *
   * The caller asserts that bookingPaymentId and financePaymentId refer to the
   * same real-world payment based on authoritative external knowledge
   * (e.g. a webhook that received both identifiers).
   *
   * Idempotent: duplicate requests for the same pair return the existing mapping.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN')
  create(
    @Body() dto: CreatePaymentCorrelationDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.correlationService.createMapping(dto, tenant.tenantId, actor.actorId);
  }

  /**
   * GET /api/v1/finance/admin/payment-correlations/by-booking-payment/:id
   * Returns all Finance payment mappings for a given Booking payment.
   */
  @Get('by-booking-payment/:id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByBookingPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.correlationService.findByBookingPaymentId(id, tenant.tenantId);
  }

  /**
   * GET /api/v1/finance/admin/payment-correlations/by-finance-payment/:id
   * Returns all Booking payment mappings for a given Finance payment.
   */
  @Get('by-finance-payment/:id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByFinancePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.correlationService.findByFinancePaymentId(id, tenant.tenantId);
  }
}
