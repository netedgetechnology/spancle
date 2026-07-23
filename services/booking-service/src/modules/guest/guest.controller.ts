import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UnauthorizedException,
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
import { PaymentOrchestratorService } from '../payment/services/payment-orchestrator.service';
import { GuestBookingLinkingService } from './guest-booking-linking.service';
import { BookingService }      from '../booking/services/booking.service';
import { BookingAuthorizationService } from '../booking/services/booking-authorization.service';
import { QrGenerationService } from '../qr/services/qr-generation.service';
import {
  GuestSessionDto,
  GuestCreateBookingDto,
  GuestLookupDto,
  LinkGuestBookingsDto,
  GuestInitiatePaymentDto,
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
    private readonly paymentOrchestrator:   PaymentOrchestratorService,
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

    // Issue guest payment token — authorises this guest to pay for this booking
    const guestPaymentToken = this.guestSessionService.issueGuestPaymentToken({
      bookingId:     booking.id,
      customerEmail: dto.customer.email,
      tenantId:      tenant.tenantId,
      amountMinor:   booking.finalPriceMinor ?? 0,
      currency:      booking.currency ?? 'GBP',
    });

    return {
      booking,
      qr,                 // includes qrContent for frontend display and email
      guestLookupToken,   // embed in confirmation email link
      guestPaymentToken,  // authorises POST /guest/payments/initiate
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
  // ── Guest Payment Initiation ─────────────────────────────────────────────

  /**
   * POST /api/v1/guest/payments/initiate
   *
   * Initiates a payment for a guest booking.
   *
   * Security model:
   *   The guestPaymentToken was issued by POST /guest/bookings and is bound to:
   *     bookingId      — verified: only the correct booking
   *     customerEmail  — verified: must match booking.customerEmail in DB
   *     tenantId       — verified: token is tenant-scoped
   *     amountMinor    — verified: amount pinned at token issuance
   *     currency       — verified: currency pinned at token issuance
   *     exp            — verified: 30-minute TTL
   *     jti            — unique per token; stored in booking_payments on use
   *
   *   Replay attack protection:
   *     The PaymentOrchestratorService.initiateForBooking() idempotency check
   *     returns the existing pending booking_payments row on retry. Once a
   *     payment succeeds (status != pending_payment), the orchestrator's
   *     idempotency path returns without creating a new payment.
   *
   * Rate limit: 5/min per IP.
   * Does NOT require JWT — authenticated by guestPaymentToken.
   */
  @Post('payments/initiate')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async initiateGuestPayment(
    @Body() dto: GuestInitiatePaymentDto,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request,
  ) {
    // 1. Validate HMAC + expiry + tenant — throws 401 on any failure
    const claims = this.guestSessionService.validateGuestPaymentToken(
      dto.guestPaymentToken,
      tenant.tenantId,
    );

    // 2. Verify bookingId matches token claim (prevents token re-use on another booking)
    if (claims.bid !== dto.bookingId) {
      throw new UnauthorizedException('Guest payment token does not match booking');
    }

    // 3. Load booking and verify customerEmail — prevents token use by wrong guest
    const booking = await this.bookingService.findOne(dto.bookingId, tenant.tenantId);
    if (booking.customerEmail.toLowerCase() !== claims.em) {
      // Email mismatch — log and throw same generic error to prevent oracle
      new Logger('GuestController').warn(
        `Guest payment email mismatch — token em masked booking masked tenant=${tenant.tenantId}`,
      );
      throw new UnauthorizedException('Guest payment token does not match booking');
    }

    // 4. Verify amount + currency matches booking (prevents amount tampering)
    if (
      (booking.finalPriceMinor ?? 0) !== claims.amt ||
      (booking.currency ?? 'GBP').toLowerCase() !== claims.cur
    ) {
      throw new UnauthorizedException('Guest payment token amount mismatch');
    }

    // 5. Delegate to PaymentOrchestratorService — no duplicate payment logic
    const ip = (req.headers['x-forwarded-for'] as string | undefined)
      ?? req.socket.remoteAddress
      ?? undefined;

    return this.paymentOrchestrator.initiateForBooking({
      tenantId:      tenant.tenantId,
      bookingId:     booking.id,
      branchId:      dto.branchId,
      amountMinor:   claims.amt,   // amount from token, not from request body
      currency:      claims.cur.toUpperCase(),
      customerEmail: claims.em,
      actorId:       `guest:${claims.jti}`,   // stable actor for audit log
      ipAddress:     ip,
    });
  }

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
