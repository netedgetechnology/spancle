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
import { BookingService }              from '../../booking/services/booking.service';
import { BookingAuthorizationService } from '../../booking/services/booking-authorization.service';
import { PaymentOrchestratorService }  from '../services/payment-orchestrator.service';
import { InitiateBookingPaymentDto }   from '../dto/payment.dto';

/**
 * PaymentController — consumer-facing payment operations.
 * Route prefix: /api/v1/payments
 *
 * POST /initiate  — initiate payment for a booking (PLAYER)
 *
 * Fix 2: BookingAuthorizationService.assertOwnerOrStaff() is called before
 * initiateForBooking(). A PLAYER cannot initiate payment for another user's
 * booking. ADMIN and MANAGER bypass the ownership check.
 */
@Controller('payments')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class PaymentController {
  constructor(
    private readonly orchestrator:  PaymentOrchestratorService,
    private readonly bookingService: BookingService,
    private readonly authzService:   BookingAuthorizationService,
  ) {}

  /**
   * POST /api/v1/payments/initiate
   *
   * Ownership check: booking is loaded and verified against the actor before
   * any payment record is created. ForbiddenException thrown for non-owners.
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
    // Fix 2 — ownership enforcement
    const booking = await this.bookingService.findOne(dto.bookingId, tenant.tenantId);
    this.authzService.assertOwnerOrStaff(booking, actor, 'payment initiation');

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
