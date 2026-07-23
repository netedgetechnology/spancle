import {
  Body, Controller, HttpCode, HttpStatus,
  Post, Req, UseGuards, UseInterceptors,
} from '@nestjs/common';
import type { Request }              from 'express';
import { TenantGuard, RbacGuard }    from '../../booking/guards/booking.guard';
import { AuditInterceptor }           from '../../../common/interceptors/audit.interceptor';
import { Roles }                      from '../../../common/decorators/roles.decorator';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { PaymentOrchestratorService }  from '../services/payment-orchestrator.service';
import { InitiateBookingPaymentDto }   from '../dto/payment.dto';

/**
 * PaymentController — consumer-facing payment operations.
 * Route prefix: /api/v1/payments
 *
 * POST /initiate  — initiate payment for a booking (PLAYER)
 *
 * The webhook endpoint lives in WebhookController to allow raw-body
 * parsing without affecting this controller's JSON parsing.
 */
@Controller('payments')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class PaymentController {
  constructor(
    private readonly orchestrator: PaymentOrchestratorService,
  ) {}

  /**
   * POST /api/v1/payments/initiate
   *
   * Initiates a payment for an existing booking.
   *
   * PLAYER: can only initiate payment for their own bookings.
   * ADMIN/MANAGER: can initiate for any tenant booking.
   *
   * Returns:
   *   - clientSecret — for Stripe Elements (undefined for Razorpay)
   *   - gatewayPaymentId — for Razorpay SDK (order_id)
   *   - bookingPaymentId — for status polling
   *   - gatewayName — tells frontend which SDK to initialize
   */
  @Post('initiate')
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  async initiate(
    @Body() dto: InitiateBookingPaymentDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string | undefined)
      ?? req.socket.remoteAddress
      ?? undefined;

    return this.orchestrator.initiateForBooking({
      tenantId:      tenant.tenantId,
      bookingId:     dto.bookingId,
      branchId:      dto.branchId,
      amountMinor:   dto.amountMinor,
      currency:      dto.currency,
      customerEmail: dto.customerEmail ?? '',
      customerId:    dto.customerId,
      actorId:       actor.actorId,
      ipAddress:     ip,
    });
  }
}
