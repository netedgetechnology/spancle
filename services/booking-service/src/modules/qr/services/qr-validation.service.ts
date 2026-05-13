import {
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { CACHE_MANAGER }   from '@nestjs/cache-manager';
import type { Cache }      from 'cache-manager';
import { EventEmitter2 }   from '@nestjs/event-emitter';
import { ConfigService }   from '@nestjs/config';

import { QrTokenRepository } from '../repositories/qr-token.repository';
import { BookingRepository }  from '../../booking/repositories/booking.repository';
import { BookingService }     from '../../booking/services/booking.service';
import { QrUtils }            from '../utils/qr.utils';

import type { ScanQrTokenDto, VerifyQrTokenDto } from '../dto/qr-token.dto';
import type { ScanOutcome } from '../entities/qr-scan-log.entity';

// ── Response shapes ───────────────────────────────────────────────────────────

export interface ScanResult {
  outcome:        ScanOutcome;
  granted:        boolean;
  bookingId:      string | null;
  customerName:   string | null;
  courtId:        string | null;
  branchId:       string | null;
  startsAt:       Date | null;
  endsAt:         Date | null;
  denialReason:   string | null;
  /** Signed payload for device display (booking summary) */
  devicePayload?: Record<string, unknown>;
}

export interface VerifyResult {
  valid:          boolean;
  bookingId:      string | null;
  courtId:        string | null;
  purpose:        string | null;
  expiresAt:      Date | null;
  denialReason:   string | null;
}

/** Minimum check-in window: 30 min before / 60 min after slot start */
const EARLY_MINS = 30;
const LATE_MINS  = 60;

@Injectable()
export class QrValidationService {
  private readonly logger  = new Logger(QrValidationService.name);
  private readonly secret: string;

  constructor(
    private readonly qrTokenRepository: QrTokenRepository,
    private readonly bookingRepository:  BookingRepository,
    private readonly bookingService:     BookingService,
    private readonly eventEmitter:       EventEmitter2,
    private readonly config:             ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.secret = this.config.getOrThrow<string>('QR_TOKEN_SECRET');
  }

  // ── Scan (authenticated — admin / staff app) ──────────────────────────────

  /**
   * Processes a QR code scan from the admin or staff mobile app.
   *
   * Validation pipeline (fails fast):
   *   1. HMAC signature verification (timing-safe)
   *   2. Token hash lookup — cache first, then DB
   *   3. Status check (active / expired / revoked / used)
   *   4. Expiry check (expiresAt)
   *   5. Court/branch mismatch check (if claimedCourtId provided)
   *   6. Booking status check (must be 'confirmed')
   *   7. Check-in window validation (EARLY_MINS before to LATE_MINS after start)
   *
   * On success:
   *   - Records usage (increments useCount, marks 'used' if maxUses reached)
   *   - Triggers BookingService.checkIn()
   *   - Writes scan log
   *   - Emits spancle.qr.scan_granted
   *
   * On failure:
   *   - Writes scan log with denial reason
   *   - Emits spancle.qr.scan_denied
   *   - Never throws — always returns a ScanResult
   */
  async scan(
    dto:      ScanQrTokenDto,
    tenantId: string,
    actorId:  string,
    scanIp:   string | null = null,
  ): Promise<ScanResult> {
    const start = Date.now();

    const deny = async (
      outcome:      ScanOutcome,
      denialReason: string,
      tokenId:      string | null = null,
      bookingId:    string | null = null,
      branchId:     string | null = null,
      courtId:      string | null = null,
    ): Promise<ScanResult> => {
      await this.qrTokenRepository.logScan({
        tenantId,
        tokenId,
        tokenHashPresented: QrUtils.hashToken(dto.token),
        bookingId,
        branchId,
        courtId,
        outcome,
        denialReason,
        deviceId:       dto.deviceId       ?? null,
        deviceFirmware: dto.deviceFirmware ?? null,
        scanIp,
        verificationMs: Date.now() - start,
      });

      await this.eventEmitter.emitAsync('spancle.qr.scan_denied', {
        tenantId, tokenId, bookingId, outcome, denialReason,
        deviceId: dto.deviceId, timestamp: new Date().toISOString(),
      });

      return {
        outcome, granted: false,
        bookingId, customerName: null,
        courtId, branchId, startsAt: null, endsAt: null,
        denialReason,
      };
    };

    // ── 1. Signature verification ────────────────────────────────────────────
    if (!QrUtils.verifyTokenSignature(dto.token, this.secret)) {
      return deny('denied_not_found', 'Invalid token signature');
    }

    const tokenHash = QrUtils.hashToken(dto.token);

    // ── 2. Token lookup (cache → DB) ─────────────────────────────────────────
    const token = await this.qrTokenRepository.findByHash(tokenHash);
    if (!token) {
      return deny('denied_not_found', 'Token not recognised');
    }

    // Tenant isolation — hash lookup is global, must verify tenant
    if (token.tenantId !== tenantId) {
      return deny('denied_not_found', 'Token not recognised');
    }

    // ── 3. Status check ──────────────────────────────────────────────────────
    if (token.status === 'revoked') {
      return deny('denied_revoked', 'Token has been revoked', token.id, token.bookingId, token.branchId, token.courtId);
    }
    if (token.status === 'used') {
      return deny('denied_used', 'Token has already been used the maximum number of times', token.id, token.bookingId, token.branchId, token.courtId);
    }

    // ── 4. Expiry check ──────────────────────────────────────────────────────
    if (token.expiresAt < new Date()) {
      await this.qrTokenRepository.updateStatus(token.id, tenantId, 'expired');
      return deny('denied_expired', 'Token has expired', token.id, token.bookingId, token.branchId, token.courtId);
    }

    // ── 5. Court / branch mismatch ───────────────────────────────────────────
    if (dto.claimedCourtId && dto.claimedCourtId !== token.courtId) {
      return deny(
        'denied_mismatch',
        `Token is for court ${token.courtId}, not ${dto.claimedCourtId}`,
        token.id, token.bookingId, token.branchId, token.courtId,
      );
    }

    // ── 6. Booking status check ──────────────────────────────────────────────
    const booking = await this.bookingRepository.findById(token.bookingId, tenantId);
    if (!booking || booking.status !== 'confirmed') {
      return deny(
        'denied_status',
        `Booking is not confirmed — status: ${booking?.status ?? 'not found'}`,
        token.id, token.bookingId, token.branchId, token.courtId,
      );
    }

    // ── 7. Check-in window ───────────────────────────────────────────────────
    if (token.purpose === 'booking_checkin') {
      const inWindow = QrUtils.isWithinCheckInWindow(booking.startsAt, new Date(), EARLY_MINS, LATE_MINS);
      if (!inWindow) {
        return deny(
          'denied_too_early',
          `Check-in opens ${EARLY_MINS} minutes before and closes ${LATE_MINS} minutes after session start`,
          token.id, token.bookingId, token.branchId, token.courtId,
        );
      }
    }

    // ── Grant access ─────────────────────────────────────────────────────────
    await this.qrTokenRepository.recordUsage(
      token.id, tenantId, dto.deviceId ?? null, scanIp,
    );

    // Trigger check-in on booking (idempotent — service guards duplicate check-ins)
    if (token.purpose === 'booking_checkin' && !booking.checkedInAt) {
      try {
        await this.bookingService.checkIn(token.bookingId, {}, tenantId, actorId);
      } catch (err) {
        // Check-in may fail if already checked in — not a scan failure
        this.logger.warn(`Check-in skipped for booking ${token.bookingId}: ${String(err)}`);
      }
    }

    const verificationMs = Date.now() - start;

    await this.qrTokenRepository.logScan({
      tenantId,
      tokenId:            token.id,
      tokenHashPresented: tokenHash,
      bookingId:          token.bookingId,
      branchId:           token.branchId,
      courtId:            token.courtId,
      outcome:            'granted',
      denialReason:       null,
      deviceId:           dto.deviceId       ?? null,
      deviceFirmware:     dto.deviceFirmware ?? null,
      scanIp,
      verificationMs,
    });

    await this.eventEmitter.emitAsync('spancle.qr.scan_granted', {
      tenantId, tokenId: token.id, bookingId: token.bookingId,
      courtId: token.courtId, branchId: token.branchId,
      deviceId: dto.deviceId, verificationMs,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `QR scan granted: booking=${token.bookingId} device=${dto.deviceId ?? 'app'} ` +
      `${verificationMs}ms tenant=${tenantId}`,
    );

    return {
      outcome:      'granted',
      granted:      true,
      bookingId:    token.bookingId,
      customerName: booking.customerName,
      courtId:      token.courtId,
      branchId:     token.branchId,
      startsAt:     booking.startsAt,
      endsAt:       booking.endsAt,
      denialReason: null,
      devicePayload: {
        reference:    booking.reference,
        customerName: booking.customerName,
        startsAt:     booking.startsAt.toISOString(),
        endsAt:       booking.endsAt.toISOString(),
        participants: booking.participantCount,
      },
    };
  }

  // ── Verify (unauthenticated — smart device endpoint) ─────────────────────

  /**
   * Lightweight token verification for smart access devices.
   * No booking check-in is triggered. No session required.
   * Uses signed payload for offline-compatible response.
   * Rate-limited at API gateway level (not enforced here).
   */
  async verify(dto: VerifyQrTokenDto, scanIp: string | null = null): Promise<VerifyResult> {
    // Signature check
    if (!QrUtils.verifyTokenSignature(dto.token, this.secret)) {
      return { valid: false, bookingId: null, courtId: null, purpose: null, expiresAt: null, denialReason: 'Invalid token' };
    }

    const tokenHash = QrUtils.hashToken(dto.token);

    // Cache check (no DB hit for valid, non-expired tokens)
    const cached = await this.cache.get<string>(
      // tenantId not known — use hash-only key for verify endpoint
      `qr:verify:${tokenHash}`,
    );
    if (cached) {
      const data = JSON.parse(cached) as { bookingId: string; courtId: string; purpose: string; expiresAt: number };
      if (data.expiresAt > Date.now()) {
        return {
          valid: true, bookingId: data.bookingId, courtId: data.courtId,
          purpose: data.purpose, expiresAt: new Date(data.expiresAt),
          denialReason: null,
        };
      }
    }

    const token = await this.qrTokenRepository.findByHash(tokenHash);
    if (!token) {
      return { valid: false, bookingId: null, courtId: null, purpose: null, expiresAt: null, denialReason: 'Token not found' };
    }

    if (token.status !== 'active') {
      return { valid: false, bookingId: token.bookingId, courtId: token.courtId, purpose: token.purpose, expiresAt: token.expiresAt, denialReason: `Token status: ${token.status}` };
    }

    if (token.expiresAt < new Date()) {
      return { valid: false, bookingId: token.bookingId, courtId: token.courtId, purpose: token.purpose, expiresAt: token.expiresAt, denialReason: 'Token expired' };
    }

    if (dto.claimedCourtId && dto.claimedCourtId !== token.courtId) {
      return { valid: false, bookingId: token.bookingId, courtId: token.courtId, purpose: token.purpose, expiresAt: token.expiresAt, denialReason: 'Court mismatch' };
    }

    // Cache result
    await this.cache.set(
      `qr:verify:${tokenHash}`,
      JSON.stringify({ bookingId: token.bookingId, courtId: token.courtId, purpose: token.purpose, expiresAt: token.expiresAt.getTime() }),
      Math.min(30_000, token.expiresAt.getTime() - Date.now()),
    );

    return {
      valid: true, bookingId: token.bookingId, courtId: token.courtId,
      purpose: token.purpose, expiresAt: token.expiresAt,
      denialReason: null,
    };
  }

  // ── Scan log queries ──────────────────────────────────────────────────────

  async getScanLogs(bookingId: string, tenantId: string) {
    return this.qrTokenRepository.findScanLogs(tenantId, bookingId);
  }

  async getDeviceScanLogs(deviceId: string, tenantId: string, from?: Date, to?: Date) {
    return this.qrTokenRepository.findScanLogsByDevice(tenantId, deviceId, from, to);
  }
}
