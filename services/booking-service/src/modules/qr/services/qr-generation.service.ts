import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService }     from '@nestjs/config';
import { EventEmitter2 }     from '@nestjs/event-emitter';
import { CACHE_MANAGER }     from '@nestjs/cache-manager';
import type { Cache }        from 'cache-manager';

import { QrTokenRepository } from '../repositories/qr-token.repository';
import { BookingRepository }  from '../../booking/repositories/booking.repository';
import { BookingLogRepository } from '../../booking/repositories/booking-support.repository';
import { QrUtils, type QrTokenPayload } from '../utils/qr.utils';

import type { IssueQrTokenDto, RevokeQrTokenDto } from '../dto/qr-token.dto';
import type { QrTokenEntity }  from '../entities/qr-token.entity';

export interface IssuedQrToken {
  tokenId:       string;
  /** Raw token — embedded in QR code. Returned once; never stored. */
  rawToken:      string;
  /** QR code content string (deep-link format for mobile app) */
  qrContent:     string;
  /** Signed payload for offline device verification */
  signedPayload: string;
  purpose:       string;
  expiresAt:     Date;
  maxUses:       number;
}

@Injectable()
export class QrGenerationService {
  private readonly logger  = new Logger(QrGenerationService.name);
  private readonly secret: string;

  constructor(
    private readonly qrTokenRepository:  QrTokenRepository,
    private readonly bookingRepository:  BookingRepository,
    private readonly logRepository:      BookingLogRepository,
    private readonly eventEmitter:       EventEmitter2,
    private readonly config:             ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {
    this.secret = this.config.getOrThrow<string>('QR_TOKEN_SECRET');
  }

  // ── Issue ──────────────────────────────────────────────────────────────────

  /**
   * Issues a new QR token for a booking.
   *
   * Validation:
   *   1. Booking exists and belongs to tenant
   *   2. Booking is in 'confirmed' status
   *   3. No active un-expired token already exists (reissue returns existing)
   *
   * Returns the raw token once — it is never stored and cannot be retrieved again.
   */
  async issue(
    dto:      IssueQrTokenDto,
    tenantId: string,
    actorId:  string,
  ): Promise<IssuedQrToken> {
    const booking = await this.bookingRepository.findById(dto.bookingId, tenantId);
    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== 'confirmed' && booking.status !== 'pending_payment') {
      throw new UnprocessableEntityException(
        `QR tokens can only be issued for confirmed bookings — status: ${booking.status}`,
      );
    }

    const purpose    = dto.purpose    ?? 'booking_checkin';
    const ttlMinutes = dto.ttlMinutes ?? 1_440;   // 24 h default
    const maxUses    = dto.maxUses    ?? 1;
    const expiresAt  = QrUtils.expiresAt(ttlMinutes);

    // Revoke any existing active token for this booking (re-issue flow)
    const existing = await this.qrTokenRepository.findActiveForBooking(dto.bookingId, tenantId);
    if (existing) {
      await this.qrTokenRepository.updateStatus(existing.id, tenantId, 'revoked', {
        revokedAt:    new Date(),
        revokedById:  actorId,
        revokeReason: 'Superseded by re-issue',
      });
      await this.cache.del(QrUtils.redisKey(tenantId, existing.tokenHash));
    }

    // Generate crypto material
    const { rawToken, tokenHash } = QrUtils.generateToken(
      tenantId, dto.bookingId, this.secret,
    );

    const payload: QrTokenPayload = {
      tenantId,
      bookingId: dto.bookingId,
      courtId:   booking.courtId,
      branchId:  booking.branchId,
      purpose,
      issuedAt:  Date.now(),
      expiresAt: expiresAt.getTime(),
      maxUses,
      nonce:     rawToken.split('.')[1] ?? '',
    };

    const signedPayload = QrUtils.buildSignedPayload(payload, this.secret);

    const token = await this.qrTokenRepository.create({
      tenantId,
      branchId:      booking.branchId,
      courtId:       booking.courtId,
      bookingId:     dto.bookingId,
      userId:        booking.userId,
      tokenHash,
      signedPayload,
      purpose:       purpose as QrTokenEntity['purpose'],
      status:        'active',
      maxUses,
      useCount:      0,
      expiresAt,
      issuedById:    actorId,
    });

    // Cache token metadata for fast scan path (TTL = token TTL)
    const cacheTtlMs = ttlMinutes * 60_000;
    await this.cache.set(
      QrUtils.redisKey(tenantId, tokenHash),
      JSON.stringify({ tokenId: token.id, bookingId: dto.bookingId, expiresAt: expiresAt.getTime() }),
      cacheTtlMs,
    );

    await this.logRepository.insert({
      tenantId,
      bookingId:  dto.bookingId,
      action:     'status_changed',
      actorId,
      actorType:  'user',
      note:       `QR token issued — purpose=${purpose} ttl=${ttlMinutes}min`,
    });

    await this.eventEmitter.emitAsync('spancle.qr.issued', {
      tenantId, bookingId: dto.bookingId, tokenId: token.id,
      purpose, actorId, timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `QR issued: token=${token.id} booking=${dto.bookingId} tenant=${tenantId}`,
    );

    const qrContent = QrUtils.buildQrContent(rawToken, purpose);

    return {
      tokenId:       token.id,
      rawToken,
      qrContent,
      signedPayload,
      purpose,
      expiresAt,
      maxUses,
    };
  }

  // ── Revoke ─────────────────────────────────────────────────────────────────

  async revoke(
    tokenId:  string,
    dto:      RevokeQrTokenDto,
    tenantId: string,
    actorId:  string,
  ): Promise<void> {
    const token = await this.qrTokenRepository.findByIdOrFail(tokenId, tenantId);

    if (token.status === 'revoked') {
      throw new BadRequestException('Token is already revoked');
    }

    await this.qrTokenRepository.updateStatus(token.id, tenantId, 'revoked', {
      revokedAt:    new Date(),
      revokedById:  actorId,
      revokeReason: dto.reason,
    });

    await this.cache.del(QrUtils.redisKey(tenantId, token.tokenHash));

    await this.logRepository.insert({
      tenantId,
      bookingId: token.bookingId,
      action:    'status_changed',
      actorId,
      actorType: 'admin',
      note:      `QR token revoked — reason: ${dto.reason}`,
    });

    await this.eventEmitter.emitAsync('spancle.qr.revoked', {
      tenantId, tokenId, bookingId: token.bookingId,
      actorId, reason: dto.reason, timestamp: new Date().toISOString(),
    });
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async findByBooking(
    bookingId: string,
    tenantId:  string,
  ): Promise<QrTokenEntity[]> {
    const booking = await this.bookingRepository.findById(bookingId, tenantId);
    if (!booking) throw new NotFoundException('Booking not found');
    return this.qrTokenRepository.findByBooking(bookingId, tenantId);
  }

  async findById(id: string, tenantId: string): Promise<QrTokenEntity> {
    return this.qrTokenRepository.findByIdOrFail(id, tenantId);
  }
}
