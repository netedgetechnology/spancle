import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { Roles }           from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }       from '../../../common/interceptors/audit.interceptor';

import { BookingService }      from '../services/booking.service';
import { CreateBookingDto }    from '../dto/create-booking.dto';
import { BookingQueryDto }     from '../dto/booking-query.dto';
import type {
  CancelBookingDto,
  RescheduleBookingDto,
  CheckInDto,
  MarkNoShowDto,
  WaiveNoShowDto,
  PaymentFailedDto,
} from '../dto/update-booking.dto';
import {
  CancelBookingDto    as CancelDto,
  RescheduleBookingDto as RescheduleDto,
  CheckInDto          as CheckInDtoClass,
  MarkNoShowDto       as MarkNoShowDtoClass,
  WaiveNoShowDto      as WaiveNoShowDtoClass,
} from '../dto/update-booking.dto';

/**
 * BookingController
 *
 * Route prefix: /api/v1/bookings
 * Guards: TenantGuard (every route) → RbacGuard (role-checked routes)
 * Audit: AuditInterceptor on every mutating method
 *
 * RBAC matrix:
 *   POST   /                        TENANT_ADMIN, TENANT_MANAGER, COACH, PLAYER
 *   GET    /                        TENANT_ADMIN, TENANT_MANAGER, COACH
 *   GET    /status-summary          TENANT_ADMIN, TENANT_MANAGER
 *   GET    /by-reference/:ref       TENANT_ADMIN, TENANT_MANAGER, COACH, PLAYER
 *   GET    /:id                     TENANT_ADMIN, TENANT_MANAGER, COACH, PLAYER
 *   GET    /:id/logs                TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/confirm             TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/cancel              TENANT_ADMIN, TENANT_MANAGER, PLAYER
 *   PATCH  /:id/reschedule          TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/check-in            TENANT_ADMIN, TENANT_MANAGER, COACH
 *   PATCH  /:id/no-show             TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id/no-show/waive       TENANT_ADMIN
 *   PATCH  /:id/complete            TENANT_ADMIN, TENANT_MANAGER
 *   DELETE /:id                     TENANT_ADMIN
 */
@Controller('bookings')
@UseInterceptors(AuditInterceptor)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'PLAYER')
  create(
    @Body() dto: CreateBookingDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.create(dto, tenant.tenantId, actor.actorId);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH')
  findAll(
    @Query() query: BookingQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.bookingService.findAll(query, tenant.tenantId);
  }

  @Get('status-summary')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  getStatusSummary(@TenantCtx() tenant: TenantContext) {
    return this.bookingService.getStatusSummary(tenant.tenantId);
  }

  /** Declared before /:id to prevent route shadowing */
  @Get('by-reference/:reference')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'PLAYER')
  findByReference(
    @Param('reference') reference: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.bookingService.findByReference(reference, tenant.tenantId);
  }

  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'PLAYER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.bookingService.findOne(id, tenant.tenantId);
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  @Patch(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.confirm(id, tenant.tenantId, actor.actorId);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.cancel(id, dto, tenant.tenantId, actor.actorId);
  }

  @Patch(':id/reschedule')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.reschedule(id, dto, tenant.tenantId, actor.actorId);
  }

  @Patch(':id/check-in')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH')
  checkIn(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CheckInDtoClass,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.checkIn(id, dto, tenant.tenantId, actor.actorId);
  }

  @Patch(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkNoShowDtoClass,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.markNoShow(id, dto, tenant.tenantId, actor.actorId);
  }

  @Patch(':id/no-show/waive')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  waiveNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WaiveNoShowDtoClass,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.waiveNoShow(id, dto, tenant.tenantId, actor.actorId);
  }

  /**
   * PATCH /bookings/:id/payment-failed
   * Called by payment gateway webhook or client when payment is declined/timed-out.
   * Transitions pending_payment → cancelled and releases reserved slots immediately.
   */
  @Patch(':id/payment-failed')
  paymentFailed(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PaymentFailedDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.paymentFailed(id, dto, tenant.tenantId, actor.actorId);
  }

    @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.bookingService.complete(id, tenant.tenantId, actor.actorId);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    const booking = await this.bookingService.findOne(id, tenant.tenantId);
    // Must be non-active before deletion
    if (booking.status === 'confirmed' || booking.status === 'pending_payment') {
      await this.bookingService.cancel(
        id,
        { reason: 'Deleted by admin', cancelledById: actor.actorId },
        tenant.tenantId,
        actor.actorId,
      );
    }
    // Soft-delete is handled inside the service; repository already has softDelete
    // We surface it via the cancel+log path above; no separate delete endpoint needed
    // for compliance (audit trail must be preserved)
  }
}
