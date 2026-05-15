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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const constants_1 = require("@spancle/constants");
const utils_1 = require("@spancle/utils");
const identity_repository_1 = require("../../identity/repositories/identity.repository");
const password_service_1 = require("./password.service");
const token_service_1 = require("./token.service");
const auth_events_1 = require("../events/auth.events");
let AuthService = AuthService_1 = class AuthService {
    constructor(identityRepository, passwordService, tokenService, eventEmitter) {
        this.identityRepository = identityRepository;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(AuthService_1.name);
    }
    async login(dto, tenantId, meta = {}) {
        const identity = await this.identityRepository.findByEmailAndTenant(dto.email, tenantId);
        if (!identity) {
            await this.emitLoginFailed({
                tenantId,
                email: (0, utils_1.maskEmail)(dto.email),
                reason: 'invalid_credentials',
                attemptCount: 0,
                ...meta,
                timestamp: new Date().toISOString(),
            });
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        if (!identity.isActive) {
            await this.emitLoginFailed({
                tenantId,
                email: (0, utils_1.maskEmail)(dto.email),
                reason: 'account_inactive',
                attemptCount: identity.failedLoginAttempts,
                ...meta,
                timestamp: new Date().toISOString(),
            });
            throw new common_1.UnauthorizedException('Account is inactive');
        }
        if (identity.lockedUntil && identity.lockedUntil > new Date()) {
            await this.emitLoginFailed({
                tenantId,
                email: (0, utils_1.maskEmail)(dto.email),
                reason: 'account_locked',
                attemptCount: identity.failedLoginAttempts,
                ...meta,
                timestamp: new Date().toISOString(),
            });
            throw new common_1.UnauthorizedException(`Account is locked until ${identity.lockedUntil.toISOString()}`);
        }
        const passwordValid = await this.passwordService.compare(dto.password, identity.passwordHash);
        if (!passwordValid) {
            const newAttemptCount = identity.failedLoginAttempts + 1;
            const shouldLock = newAttemptCount >= constants_1.PASSWORD.MAX_FAILED_ATTEMPTS;
            const lockedUntil = shouldLock
                ? new Date(Date.now() + constants_1.PASSWORD.LOCKOUT_DURATION_MINUTES * 60 * 1000)
                : null;
            await this.identityRepository.updateLoginFailure(identity.id, tenantId, newAttemptCount, lockedUntil);
            if (shouldLock) {
                await this.emitAccountLocked({
                    tenantId,
                    identityId: identity.id,
                    userId: identity.userId,
                    lockedUntil: lockedUntil.toISOString(),
                    reason: 'Exceeded maximum failed login attempts',
                    attemptCount: newAttemptCount,
                    ...meta,
                    timestamp: new Date().toISOString(),
                });
                throw new common_1.UnauthorizedException('Account locked due to too many failed attempts');
            }
            await this.emitLoginFailed({
                tenantId,
                email: (0, utils_1.maskEmail)(dto.email),
                reason: 'invalid_credentials',
                attemptCount: newAttemptCount,
                ...meta,
                timestamp: new Date().toISOString(),
            });
            throw new common_1.UnauthorizedException('Invalid email or password');
        }
        await this.identityRepository.updateLoginSuccess(identity.id, tenantId);
        const role = await this.identityRepository.getRoleForIdentity(identity.id, tenantId);
        const issued = await this.tokenService.issueTokenPair({
            identityId: identity.id,
            userId: identity.userId,
            tenantId,
            role: role ?? 'VIEWER',
        }, meta);
        await this.emitLoginSuccess({
            tenantId,
            identityId: identity.id,
            userId: identity.userId,
            role: role ?? 'VIEWER',
            sessionId: issued.refreshTokenId,
            ...meta,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Login success — identityId: ${identity.id} tenantId: ${tenantId}`);
        return issued.tokens;
    }
    async refreshToken(dto, tenantId, meta = {}) {
        const issued = await this.tokenService.rotateRefreshToken(dto.refreshToken, tenantId, meta);
        this.logger.log(`Token rotated — tenantId: ${tenantId} family: ${issued.family}`);
        return issued.tokens;
    }
    async logout(dto, tenantId, currentJti, currentUserId, currentIdentityId, meta = {}) {
        await this.tokenService.revokeSession(tenantId, currentJti, dto.refreshToken);
        await this.eventEmitter.emitAsync(auth_events_1.AuthEventNames.LOGOUT, {
            tenantId,
            identityId: currentIdentityId,
            userId: currentUserId,
            sessionId: 'revoked',
            ...meta,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Logout — identityId: ${currentIdentityId} tenantId: ${tenantId}`);
    }
    async changePassword(dto, identityId, tenantId, actorId, meta = {}) {
        if (dto.newPassword !== dto.confirmPassword) {
            throw new common_1.UnprocessableEntityException('New password and confirmation do not match');
        }
        const identity = await this.identityRepository.findByIdAndTenant(identityId, tenantId);
        if (!identity) {
            throw new common_1.NotFoundException('Identity not found');
        }
        const currentValid = await this.passwordService.compare(dto.currentPassword, identity.passwordHash);
        if (!currentValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        this.passwordService.enforcePolicy(dto.newPassword);
        const isDifferent = await this.passwordService.isDifferentFromCurrent(dto.newPassword, identity.passwordHash);
        if (!isDifferent) {
            throw new common_1.UnprocessableEntityException('New password must be different from your current password');
        }
        const newHash = await this.passwordService.hash(dto.newPassword);
        await this.identityRepository.updatePassword(identityId, tenantId, newHash);
        await this.tokenService.revokeAllSessions(tenantId, identityId);
        const payload = {
            tenantId,
            identityId,
            userId: identity.userId,
            changedBy: actorId,
            triggeredBy: actorId === identityId ? 'user' : 'admin',
            ...meta,
            timestamp: new Date().toISOString(),
        };
        await this.eventEmitter.emitAsync(auth_events_1.AuthEventNames.PASSWORD_CHANGED, payload);
        const sessionsPayload = {
            tenantId,
            identityId,
            userId: identity.userId,
            revokedCount: -1,
            reason: 'password_change',
            ...meta,
            timestamp: new Date().toISOString(),
        };
        await this.eventEmitter.emitAsync(auth_events_1.AuthEventNames.SESSIONS_REVOKED, sessionsPayload);
        this.logger.log(`Password changed — identityId: ${identityId} tenantId: ${tenantId} by: ${actorId}`);
    }
    async emitLoginSuccess(payload) {
        try {
            await this.eventEmitter.emitAsync(auth_events_1.AuthEventNames.LOGIN_SUCCESS, payload);
        }
        catch (err) {
            this.logger.error(`Failed to emit LOGIN_SUCCESS: ${String(err)}`);
        }
    }
    async emitLoginFailed(payload) {
        try {
            await this.eventEmitter.emitAsync(auth_events_1.AuthEventNames.LOGIN_FAILED, payload);
        }
        catch (err) {
            this.logger.error(`Failed to emit LOGIN_FAILED: ${String(err)}`);
        }
    }
    async emitAccountLocked(payload) {
        try {
            await this.eventEmitter.emitAsync(auth_events_1.AuthEventNames.ACCOUNT_LOCKED, payload);
        }
        catch (err) {
            this.logger.error(`Failed to emit ACCOUNT_LOCKED: ${String(err)}`);
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository,
        password_service_1.PasswordService,
        token_service_1.TokenService,
        event_emitter_1.EventEmitter2])
], AuthService);
//# sourceMappingURL=auth.service.js.map