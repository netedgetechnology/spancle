import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle }    from '@nestjs/throttler';
import type { Request } from 'express';
import { Public, Roles } from '../../common/decorators/roles.decorator';
import { BookingActor, type BookingActorContext } from '../../common/decorators/current-user.decorator';
import { TenantCtx, type TenantContext } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../booking/guards/booking.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { GuestSessionService } from './guest-session.service';
import { GuestBookingLinkingService } from './guest-booking-linking.service';
import { BookingService }      from '../booking/services/booking.service';
import { BookingAuthorizationService } from '../booking/services/booking-authorization.service';
import { QrGenerationService } from '../qr/services/qr-generation.service';
import {
  GuestSessionDto,
  GuestCreateBookingDto,
  GuestLookupDto,
  LinkGuestBookingsDto,
} from './dto/guest.dto';

/**
 * GuestController
 *
 * Route prefix: /api/v1/guest
 *
 * All routes are @Public() — bypass JWT (RbacGuard). TenantGuard still runs
 * so x-tenant-id header is always required for tenant isolation.
 *
 * Route inventory:
 *   POST /guest/session            Issue a guest session token (anti-spam gate)
 *   POST /guest/bookings           Create a booking as a guest
 *   GET  /guest/bookings/:id       Read-only booking lookup (with guest token)
 *   GET  /guest/lookup/:token      Booking lookup via email-link token
 *   POST /guest/link-bookings      Link guest bookings to new account (PLAYER JWT)
 *
 * Security:
 *   - All mutation routes verify the X-Guest-Session header.
 *   - POST /guest/session is rate-limited at 10/min per IP.
 *   - POST /guest/bookings is rate-limited at 5/min per IP.
 *   - GET routes are rate-limited at 30/min per IP.
 *   - Guest tokens are HMAC-signed (no DB). Replay within TTL is acceptable
 *     for the session token (booking is idempotent via slot reservation TTL).
 */
@Controller('guest')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class GuestController {
  constructor(
    private readonly guestSessionService:  GuestSessionService,
    private readonly linkingService:       GuestBookingLinkingService,
    private readonly bookingService:        BookingService,
    private readonly authzService:          BookingAuthorizationService,
    private readonly qrGenerationService:   QrGenerationService,
  ) {}

  // ── Phase 2: Guest Session ────────────────────────────────────────────────

  /**
   * POST /api/v1/guest/session
   *
   * Issues a short-lived (15 min) HMAC-signed guest session token.
   * No database record. No identity created. Tenant-bound.
   *
   * Rate limit: 10 requests per minute per IP.
   * The guest session token must be passed as X-Guest-Session header
   * when calling POST /guest/bookings.
   */
  @Post('session')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  issueGuestSession(
    @Body() _dto: GuestSessionDto,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request,
  ) {
    const clientIp = (req.headers['x-forwarded-for'] as string | undefined)
      ?? req.socket.remoteAddress
      ?? undefined;
    return this.guestSessionService.issue(tenant.tenantId, clientIp);
  }

  // ── Phase 3: Guest Booking ────────────────────────────────────────────────

  /**
   * POST /api/v1/guest/bookings
   *
   * Creates a booking with userId=null using the existing BookingService.create().
   *
   * The guest must present a valid guest session token in X-Guest-Session header.
   * Uses walk_in channel with metadata.guestBooking=true (no enum migration needed).
   *
   * After booking creation:
   *   - QR is issued immediately (if slot status is confirmed/pending_payment)
   *   - QR + reference included in response for display + email delivery
   *
   * Rate limit: 5 requests per minute per IP (tighter than session issuance).
   */
  @Post('bookings')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async createGuestBooking(
    @Body() dto: GuestCreateBookingDto,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request,
  ) {
    // Validate guest session (HMAC — no DB query)
    this.guestSessionService.validate(dto.guestSession, tenant.tenantId);

    // Reuse existing BookingService.create() — no guest-specific booking engine
    // userId omitted → booking.userId = null (walk-in guest pattern)
    const booking = await this.bookingService.create(
      {
        slotIds:          dto.slotIds,
        branchId:         dto.branchId,
        courtId:          dto.courtId,
        sportId:          dto.sportId,
        customer: {
          name:     dto.customer.name,
          email:    dto.customer.email,
          phone:    dto.customer.phone,
          isMember: false,           // guests are never members
          // userId intentionally omitted → null on entity
        },
        channel:          'walk_in', // Phase 6: walk_in used instead of new enum
        participantCount: dto.participantCount,
        customerNotes:    dto.customerNotes,
        metadata: {
          guestBooking: true,        // machine-readable marker for reporting
          ...(dto.metadata ?? {}),
        },
      },
      tenant.tenantId,
      'guest',                       // actorId for audit log
    );

    // Issue QR immediately using existing QrGenerationService (Phase 4)
    // QR infrastructure is unchanged — same token, same scan flow
    let qr: Awaited<ReturnType<typeof this.qrGenerationService.issue>> | null = null;
    try {
      qr = await this.qrGenerationService.issue(
        { bookingId: booking.id },
        tenant.tenantId,
        'guest',
      );
    } catch {
      // QR issuance is best-effort — don't fail the booking if QR fails
      // (booking is already confirmed; QR can be re-issued by staff)
    }

    // Issue guest lookup token for email link
    const guestLookupToken = this.guestSessionService.issueGuestLookupToken({
      bookingId:     booking.id,
      customerEmail: dto.customer.email,
      tenantId:      tenant.tenantId,
    });

    return {
      booking,
      qr,                // includes qrContent for frontend display and email
      guestLookupToken,  // embed in confirmation email link
    };
  }

  // ── Phase 7: Guest Booking Lookup ────────────────────────────────────────

  /**
   * GET /api/v1/guest/lookup/:token
   *
   * Read-only booking view using the signed guest lookup token from the
   * confirmation email. No enumeration possible — token is HMAC-bound to
   * specific bookingId + customerEmail.
   *
   * Rate limit: 30/min per IP.
   */
  @Get('lookup/:token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async guestLookup(
    @Param('token') token: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    const { bookingId } = this.guestSessionService.validateGuestLookupToken(
      token,
      tenant.tenantId,
    );
    const booking = await this.bookingService.findOne(bookingId, tenant.tenantId);
    // Return read-only view — no sensitive admin fields
    return {
      id:            booking.id,
      reference:     booking.reference,
      status:        booking.status,
      startsAt:      booking.startsAt,
      endsAt:        booking.endsAt,
      totalDurationMins: booking.totalDurationMins,
      finalPriceMinor:   booking.finalPriceMinor,
      currency:      booking.currency,
      courtId:       booking.courtId,
      customerName:  booking.customerName,
    };
  }

  // ── Phase 5: Historical Booking Linking ──────────────────────────────────

  /**
   * POST /api/v1/guest/link-bookings
   *
   * Links historical guest bookings (userId=null) to the authenticated PLAYER.
   * Called by the consumer app after successful registration.
   * userId comes from the verified JWT — never from the request body.
   */
  @Post('link-bookings')
  @HttpCode(HttpStatus.OK)
  @Roles('PLAYER')
  linkGuestBookings(
    @Body() dto: LinkGuestBookingsDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    if (!actor.userId) return { linked: 0 };
    return this.linkingService.linkGuestBookings({
      userId:        actor.userId,
      customerEmail: dto.customerEmail,
      tenantId:      tenant.tenantId,
    });
  }
}
