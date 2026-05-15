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
var TokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const constants_1 = require("@spancle/constants");
const utils_1 = require("@spancle/utils");
const auth_repository_1 = require("../repositories/auth.repository");
let TokenService = TokenService_1 = class TokenService {
    constructor(jwtService, config, authRepository) {
        this.jwtService = jwtService;
        this.config = config;
        this.authRepository = authRepository;
        this.logger = new common_1.Logger(TokenService_1.name);
        this.accessExpirySeconds = this.config.get('JWT_ACCESS_TOKEN_EXPIRY_SECONDS', constants_1.JWT.ACCESS_TOKEN_EXPIRY_SECONDS);
        this.refreshExpirySeconds = this.config.get('JWT_REFRESH_TOKEN_EXPIRY_SECONDS', constants_1.JWT.REFRESH_TOKEN_EXPIRY_SECONDS);
        this.issuer = this.config.get('JWT_ISSUER', constants_1.JWT.ISSUER);
    }
    async issueTokenPair(subject, meta = {}) {
        const jti = (0, utils_1.generateUuid)();
        const family = (0, utils_1.generateUuid)();
        const refreshTokenId = (0, utils_1.generateUuid)();
        const rawRefreshToken = (0, utils_1.generateSecureToken)(48);
        const accessToken = this.signAccessToken(subject, jti);
        const now = Math.floor(Date.now() / 1000);
        const record = {
            tokenId: refreshTokenId,
            identityId: subject.identityId,
            userId: subject.userId,
            tenantId: subject.tenantId,
            role: subject.role,
            jti,
            family,
            issuedAt: now,
            expiresAt: now + this.refreshExpirySeconds,
            userAgent: meta.userAgent,
            ipAddress: meta.ipAddress,
        };
        await this.authRepository.storeRefreshToken(subject.tenantId, rawRefreshToken, record, this.refreshExpirySeconds);
        return {
            tokens: {
                accessToken,
                refreshToken: rawRefreshToken,
                expiresIn: this.accessExpirySeconds,
                tokenType: 'Bearer',
            },
            refreshTokenId,
            accessTokenJti: jti,
            family,
        };
    }
    async rotateRefreshToken(rawRefreshToken, tenantId, meta = {}) {
        const record = await this.authRepository.getRefreshToken(tenantId, rawRefreshToken);
        if (!record) {
            this.logger.warn(`Refresh token not found — possible reuse attack. tenantId: ${tenantId}`);
            throw new common_1.UnauthorizedException('Refresh token is invalid or expired');
        }
        if (record.tenantId !== tenantId) {
            this.logger.error(`Refresh token tenant mismatch — stored: ${record.tenantId} presented: ${tenantId}`);
            await this.authRepository.revokeTokenFamily(tenantId, record.family);
            throw new common_1.UnauthorizedException('Refresh token is invalid');
        }
        const now = Math.floor(Date.now() / 1000);
        if (record.expiresAt < now) {
            await this.authRepository.deleteRefreshToken(tenantId, rawRefreshToken);
            throw new common_1.UnauthorizedException('Refresh token has expired');
        }
        await this.authRepository.deleteRefreshToken(tenantId, rawRefreshToken);
        return this.issueTokenPair({
            identityId: record.identityId,
            userId: record.userId,
            tenantId: record.tenantId,
            role: record.role,
        }, meta);
    }
    async revokeSession(tenantId, accessTokenJti, rawRefreshToken, remainingAccessTtlSeconds) {
        const ttl = remainingAccessTtlSeconds ?? this.accessExpirySeconds;
        await this.authRepository.blacklistToken(tenantId, accessTokenJti, ttl);
        if (rawRefreshToken) {
            await this.authRepository.deleteRefreshToken(tenantId, rawRefreshToken);
        }
    }
    async revokeAllSessions(tenantId, identityId) {
        await this.authRepository.revokeAllIdentitySessions(tenantId, identityId);
        this.logger.log(`All sessions revoked — identityId: ${identityId} tenantId: ${tenantId}`);
    }
    signAccessToken(subject, jti) {
        return this.jwtService.sign({
            userId: subject.userId,
            tenantId: subject.tenantId,
            role: subject.role,
            jti,
        }, {
            subject: subject.identityId,
            expiresIn: this.accessExpirySeconds,
            issuer: this.issuer,
        });
    }
};
exports.TokenService = TokenService;
exports.TokenService = TokenService = TokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService,
        auth_repository_1.AuthRepository])
], TokenService);
//# sourceMappingURL=token.service.js.map