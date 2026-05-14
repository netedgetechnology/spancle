import type { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { QrTokenRepository } from '../repositories/qr-token.repository';
import { BookingRepository } from '../../booking/repositories/booking.repository';
import { BookingService } from '../../booking/services/booking.service';
import type { ScanQrTokenDto, VerifyQrTokenDto } from '../dto/qr-token.dto';
import type { ScanOutcome } from '../entities/qr-scan-log.entity';
export interface ScanResult {
    outcome: ScanOutcome;
    granted: boolean;
    bookingId: string | null;
    customerName: string | null;
    courtId: string | null;
    branchId: string | null;
    startsAt: Date | null;
    endsAt: Date | null;
    denialReason: string | null;
    /** Signed payload for device display (booking summary) */
    devicePayload?: Record<string, unknown>;
}
export interface VerifyResult {
    valid: boolean;
    bookingId: string | null;
    courtId: string | null;
    purpose: string | null;
    expiresAt: Date | null;
    denialReason: string | null;
}
export declare class QrValidationService {
    private readonly qrTokenRepository;
    private readonly bookingRepository;
    private readonly bookingService;
    private readonly eventEmitter;
    private readonly config;
    private readonly cache;
    private readonly logger;
    private readonly secret;
    constructor(qrTokenRepository: QrTokenRepository, bookingRepository: BookingRepository, bookingService: BookingService, eventEmitter: EventEmitter2, config: ConfigService, cache: Cache);
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
    scan(dto: ScanQrTokenDto, tenantId: string, actorId: string, scanIp?: string | null): Promise<ScanResult>;
    /**
     * Lightweight token verification for smart access devices.
     * No booking check-in is triggered. No session required.
     * Uses signed payload for offline-compatible response.
     * Rate-limited at API gateway level (not enforced here).
     */
    verify(dto: VerifyQrTokenDto, scanIp?: string | null): Promise<VerifyResult>;
    getScanLogs(bookingId: string, tenantId: string): Promise<import("../entities/qr-scan-log.entity").QrScanLogEntity[]>;
    getDeviceScanLogs(deviceId: string, tenantId: string, from?: Date, to?: Date): Promise<import("../entities/qr-scan-log.entity").QrScanLogEntity[]>;
}
//# sourceMappingURL=qr-validation.service.d.ts.map