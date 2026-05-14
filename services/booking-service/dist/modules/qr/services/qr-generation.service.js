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
var QrGenerationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrGenerationService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const cache_manager_1 = require("@nestjs/cache-manager");
const qr_token_repository_1 = require("../repositories/qr-token.repository");
const booking_repository_1 = require("../../booking/repositories/booking.repository");
const booking_support_repository_1 = require("../../booking/repositories/booking-support.repository");
const qr_utils_1 = require("../utils/qr.utils");
let QrGenerationService = QrGenerationService_1 = class QrGenerationService {
    constructor(qrTokenRepository, bookingRepository, logRepository, eventEmitter, config, cache) {
        this.qrTokenRepository = qrTokenRepository;
        this.bookingRepository = bookingRepository;
        this.logRepository = logRepository;
        this.eventEmitter = eventEmitter;
        this.config = config;
        this.cache = cache;
        this.logger = new common_1.Logger(QrGenerationService_1.name);
        this.secret = this.config.getOrThrow('QR_TOKEN_SECRET');
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
    async issue(dto, tenantId, actorId) {
        const booking = await this.bookingRepository.findById(dto.bookingId, tenantId);
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        if (booking.status !== 'confirmed' && booking.status !== 'pending_payment') {
            throw new common_1.UnprocessableEntityException(`QR tokens can only be issued for confirmed bookings — status: ${booking.status}`);
        }
        const purpose = dto.purpose ?? 'booking_checkin';
        const ttlMinutes = dto.ttlMinutes ?? 1_440; // 24 h default
        const maxUses = dto.maxUses ?? 1;
        const expiresAt = qr_utils_1.QrUtils.expiresAt(ttlMinutes);
        // Revoke any existing active token for this booking (re-issue flow)
        const existing = await this.qrTokenRepository.findActiveForBooking(dto.bookingId, tenantId);
        if (existing) {
            await this.qrTokenRepository.updateStatus(existing.id, tenantId, 'revoked', {
                revokedAt: new Date(),
                revokedById: actorId,
                revokeReason: 'Superseded by re-issue',
            });
            await this.cache.del(qr_utils_1.QrUtils.redisKey(tenantId, existing.tokenHash));
        }
        // Generate crypto material
        const { rawToken, tokenHash } = qr_utils_1.QrUtils.generateToken(tenantId, dto.bookingId, this.secret);
        const payload = {
            tenantId,
            bookingId: dto.bookingId,
            courtId: booking.courtId,
            branchId: booking.branchId,
            purpose,
            issuedAt: Date.now(),
            expiresAt: expiresAt.getTime(),
            maxUses,
            nonce: rawToken.split('.')[1] ?? '',
        };
        const signedPayload = qr_utils_1.QrUtils.buildSignedPayload(payload, this.secret);
        const token = await this.qrTokenRepository.create({
            tenantId,
            branchId: booking.branchId,
            courtId: booking.courtId,
            bookingId: dto.bookingId,
            userId: booking.userId,
            tokenHash,
            signedPayload,
            purpose: purpose,
            status: 'active',
            maxUses,
            useCount: 0,
            expiresAt,
            issuedById: actorId,
        });
        // Cache token metadata for fast scan path (TTL = token TTL)
        const cacheTtlMs = ttlMinutes * 60_000;
        await this.cache.set(qr_utils_1.QrUtils.redisKey(tenantId, tokenHash), JSON.stringify({ tokenId: token.id, bookingId: dto.bookingId, expiresAt: expiresAt.getTime() }), cacheTtlMs);
        await this.logRepository.insert({
            tenantId,
            bookingId: dto.bookingId,
            action: 'status_changed',
            actorId,
            actorType: 'user',
            note: `QR token issued — purpose=${purpose} ttl=${ttlMinutes}min`,
        });
        await this.eventEmitter.emitAsync('spancle.qr.issued', {
            tenantId, bookingId: dto.bookingId, tokenId: token.id,
            purpose, actorId, timestamp: new Date().toISOString(),
        });
        this.logger.log(`QR issued: token=${token.id} booking=${dto.bookingId} tenant=${tenantId}`);
        const qrContent = qr_utils_1.QrUtils.buildQrContent(rawToken, purpose);
        return {
            tokenId: token.id,
            rawToken,
            qrContent,
            signedPayload,
            purpose,
            expiresAt,
            maxUses,
        };
    }
    // ── Revoke ─────────────────────────────────────────────────────────────────
    async revoke(tokenId, dto, tenantId, actorId) {
        const token = await this.qrTokenRepository.findByIdOrFail(tokenId, tenantId);
        if (token.status === 'revoked') {
            throw new common_1.BadRequestException('Token is already revoked');
        }
        await this.qrTokenRepository.updateStatus(token.id, tenantId, 'revoked', {
            revokedAt: new Date(),
            revokedById: actorId,
            revokeReason: dto.reason,
        });
        await this.cache.del(qr_utils_1.QrUtils.redisKey(tenantId, token.tokenHash));
        await this.logRepository.insert({
            tenantId,
            bookingId: token.bookingId,
            action: 'status_changed',
            actorId,
            actorType: 'admin',
            note: `QR token revoked — reason: ${dto.reason}`,
        });
        await this.eventEmitter.emitAsync('spancle.qr.revoked', {
            tenantId, tokenId, bookingId: token.bookingId,
            actorId, reason: dto.reason, timestamp: new Date().toISOString(),
        });
    }
    // ── List ───────────────────────────────────────────────────────────────────
    async findByBooking(bookingId, tenantId) {
        const booking = await this.bookingRepository.findById(bookingId, tenantId);
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        return this.qrTokenRepository.findByBooking(bookingId, tenantId);
    }
    async findById(id, tenantId) {
        return this.qrTokenRepository.findByIdOrFail(id, tenantId);
    }
};
exports.QrGenerationService = QrGenerationService;
exports.QrGenerationService = QrGenerationService = QrGenerationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [qr_token_repository_1.QrTokenRepository,
        booking_repository_1.BookingRepository,
        booking_support_repository_1.BookingLogRepository,
        event_emitter_1.EventEmitter2,
        config_1.ConfigService, Object])
], QrGenerationService);
//# sourceMappingURL=qr-generation.service.js.map