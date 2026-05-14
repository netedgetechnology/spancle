"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var QrValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrValidationService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const qr_token_repository_1 = require("../repositories/qr-token.repository");
const booking_repository_1 = require("../../booking/repositories/booking.repository");
const booking_service_1 = require("../../booking/services/booking.service");
const qr_utils_1 = require("../utils/qr.utils");
/** Minimum check-in window: 30 min before / 60 min after slot start */
const EARLY_MINS = 30;
const LATE_MINS = 60;
let QrValidationService = QrValidationService_1 = class QrValidationService {
    constructor(qrTokenRepository, bookingRepository, bookingService, eventEmitter, config, cache) {
        this.qrTokenRepository = qrTokenRepository;
        this.bookingRepository = bookingRepository;
        this.bookingService = bookingService;
        this.eventEmitter = eventEmitter;
        this.config = config;
        this.cache = cache;
        this.logger = new common_1.Logger(QrValidationService_1.name);
        this.secret = this.config.getOrThrow('QR_TOKEN_SECRET');
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
    async scan(dto, tenantId, actorId, scanIp = null) {
        const start = Date.now();
        const deny = async (outcome, denialReason, tokenId = null, bookingId = null, branchId = null, courtId = null) => {
            await this.qrTokenRepository.logScan({
                tenantId,
                tokenId,
                tokenHashPresented: qr_utils_1.QrUtils.hashToken(dto.token),
                bookingId,
                branchId,
                courtId,
                outcome,
                denialReason,
                deviceId: dto.deviceId ?? null,
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
        if (!qr_utils_1.QrUtils.verifyTokenSignature(dto.token, this.secret)) {
            return deny('denied_not_found', 'Invalid token signature');
        }
        const tokenHash = qr_utils_1.QrUtils.hashToken(dto.token);
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
            return deny('denied_mismatch', `Token is for court ${token.courtId}, not ${dto.claimedCourtId}`, token.id, token.bookingId, token.branchId, token.courtId);
        }
        // ── 6. Booking status check ──────────────────────────────────────────────
        const booking = await this.bookingRepository.findById(token.bookingId, tenantId);
        if (!booking || booking.status !== 'confirmed') {
            return deny('denied_status', `Booking is not confirmed — status: ${booking?.status ?? 'not found'}`, token.id, token.bookingId, token.branchId, token.courtId);
        }
        // ── 7. Check-in window ───────────────────────────────────────────────────
        if (token.purpose === 'booking_checkin') {
            const inWindow = qr_utils_1.QrUtils.isWithinCheckInWindow(booking.startsAt, new Date(), EARLY_MINS, LATE_MINS);
            if (!inWindow) {
                return deny('denied_too_early', `Check-in opens ${EARLY_MINS} minutes before and closes ${LATE_MINS} minutes after session start`, token.id, token.bookingId, token.branchId, token.courtId);
            }
        }
        // ── Grant access ─────────────────────────────────────────────────────────
        await this.qrTokenRepository.recordUsage(token.id, tenantId, dto.deviceId ?? null, scanIp);
        // Trigger check-in on booking (idempotent — service guards duplicate check-ins)
        if (token.purpose === 'booking_checkin' && !booking.checkedInAt) {
            try {
                await this.bookingService.checkIn(token.bookingId, {}, tenantId, actorId);
            }
            catch (err) {
                // Check-in may fail if already checked in — not a scan failure
                this.logger.warn(`Check-in skipped for booking ${token.bookingId}: ${String(err)}`);
            }
        }
        const verificationMs = Date.now() - start;
        await this.qrTokenRepository.logScan({
            tenantId,
            tokenId: token.id,
            tokenHashPresented: tokenHash,
            bookingId: token.bookingId,
            branchId: token.branchId,
            courtId: token.courtId,
            outcome: 'granted',
            denialReason: null,
            deviceId: dto.deviceId ?? null,
            deviceFirmware: dto.deviceFirmware ?? null,
            scanIp,
            verificationMs,
        });
        await this.eventEmitter.emitAsync('spancle.qr.scan_granted', {
            tenantId, tokenId: token.id, bookingId: token.bookingId,
            courtId: token.courtId, branchId: token.branchId,
            deviceId: dto.deviceId, verificationMs,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`QR scan granted: booking=${token.bookingId} device=${dto.deviceId ?? 'app'} ` +
            `${verificationMs}ms tenant=${tenantId}`);
        return {
            outcome: 'granted',
            granted: true,
            bookingId: token.bookingId,
            customerName: booking.customerName,
            courtId: token.courtId,
            branchId: token.branchId,
            startsAt: booking.startsAt,
            endsAt: booking.endsAt,
            denialReason: null,
            devicePayload: {
                reference: booking.reference,
                customerName: booking.customerName,
                startsAt: booking.startsAt.toISOString(),
                endsAt: booking.endsAt.toISOString(),
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
    async verify(dto, scanIp = null) {
        // Signature check
        if (!qr_utils_1.QrUtils.verifyTokenSignature(dto.token, this.secret)) {
            return { valid: false, bookingId: null, courtId: null, purpose: null, expiresAt: null, denialReason: 'Invalid token' };
        }
        const tokenHash = qr_utils_1.QrUtils.hashToken(dto.token);
        // Cache check (no DB hit for valid, non-expired tokens)
        const cached = await this.cache.get(
        // tenantId not known — use hash-only key for verify endpoint
        `qr:verify:${tokenHash}`);
        if (cached) {
            const data = JSON.parse(cached);
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
        await this.cache.set(`qr:verify:${tokenHash}`, JSON.stringify({ bookingId: token.bookingId, courtId: token.courtId, purpose: token.purpose, expiresAt: token.expiresAt.getTime() }), Math.min(30_000, token.expiresAt.getTime() - Date.now()));
        return {
            valid: true, bookingId: token.bookingId, courtId: token.courtId,
            purpose: token.purpose, expiresAt: token.expiresAt,
            denialReason: null,
        };
    }
    // ── Scan log queries ──────────────────────────────────────────────────────
    async getScanLogs(bookingId, tenantId) {
        return this.qrTokenRepository.findScanLogs(tenantId, bookingId);
    }
    async getDeviceScanLogs(deviceId, tenantId, from, to) {
        return this.qrTokenRepository.findScanLogsByDevice(tenantId, deviceId, from, to);
    }
};
exports.QrValidationService = QrValidationService;
exports.QrValidationService = QrValidationService = QrValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [qr_token_repository_1.QrTokenRepository,
        booking_repository_1.BookingRepository,
        booking_service_1.BookingService,
        event_emitter_1.EventEmitter2,
        config_1.ConfigService, Object])
], QrValidationService);
//# sourceMappingURL=qr-validation.service.js.map