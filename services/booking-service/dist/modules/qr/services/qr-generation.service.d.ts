import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Cache } from 'cache-manager';
import { QrTokenRepository } from '../repositories/qr-token.repository';
import { BookingRepository } from '../../booking/repositories/booking.repository';
import { BookingLogRepository } from '../../booking/repositories/booking-support.repository';
import type { IssueQrTokenDto, RevokeQrTokenDto } from '../dto/qr-token.dto';
import type { QrTokenEntity } from '../entities/qr-token.entity';
export interface IssuedQrToken {
    tokenId: string;
    /** Raw token — embedded in QR code. Returned once; never stored. */
    rawToken: string;
    /** QR code content string (deep-link format for mobile app) */
    qrContent: string;
    /** Signed payload for offline device verification */
    signedPayload: string;
    purpose: string;
    expiresAt: Date;
    maxUses: number;
}
export declare class QrGenerationService {
    private readonly qrTokenRepository;
    private readonly bookingRepository;
    private readonly logRepository;
    private readonly eventEmitter;
    private readonly config;
    private readonly cache;
    private readonly logger;
    private readonly secret;
    constructor(qrTokenRepository: QrTokenRepository, bookingRepository: BookingRepository, logRepository: BookingLogRepository, eventEmitter: EventEmitter2, config: ConfigService, cache: Cache);
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
    issue(dto: IssueQrTokenDto, tenantId: string, actorId: string): Promise<IssuedQrToken>;
    revoke(tokenId: string, dto: RevokeQrTokenDto, tenantId: string, actorId: string): Promise<void>;
    findByBooking(bookingId: string, tenantId: string): Promise<QrTokenEntity[]>;
    findById(id: string, tenantId: string): Promise<QrTokenEntity>;
}
//# sourceMappingURL=qr-generation.service.d.ts.map