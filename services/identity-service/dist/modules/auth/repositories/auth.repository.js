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
var AuthRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
const constants_1 = require("@spancle/constants");
const utils_1 = require("@spancle/utils");
let AuthRepository = AuthRepository_1 = class AuthRepository {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(AuthRepository_1.name);
    }
    onModuleInit() {
        const redisConfig = {
            host: this.config.get('REDIS_HOST', 'localhost'),
            port: this.config.get('REDIS_PORT', 6379),
            password: this.config.get('REDIS_PASSWORD'),
            tls: this.config.get('REDIS_TLS') === 'true' ? {} : undefined,
            lazyConnect: false,
        };
        this.sessionRedis = new ioredis_1.Redis({ ...redisConfig, db: constants_1.REDIS_DB.SESSION });
        this.cacheRedis = new ioredis_1.Redis({ ...redisConfig, db: constants_1.REDIS_DB.CACHE });
        this.sessionRedis.on('error', (err) => this.logger.error(`Session Redis error: ${String(err)}`));
        this.cacheRedis.on('error', (err) => this.logger.error(`Cache Redis error: ${String(err)}`));
    }
    async storeRefreshToken(tenantId, rawToken, record, ttlSeconds) {
        const key = this.refreshTokenKey(tenantId, rawToken);
        await this.sessionRedis.setex(key, ttlSeconds, JSON.stringify(record));
        const sessionSetKey = this.sessionSetKey(tenantId, record.identityId);
        await this.sessionRedis.sadd(sessionSetKey, rawToken);
        await this.sessionRedis.expire(sessionSetKey, ttlSeconds);
    }
    async getRefreshToken(tenantId, rawToken) {
        const key = this.refreshTokenKey(tenantId, rawToken);
        const data = await this.sessionRedis.get(key);
        if (!data)
            return null;
        try {
            return JSON.parse(data);
        }
        catch {
            this.logger.error(`Failed to parse refresh token record for key ${key}`);
            return null;
        }
    }
    async deleteRefreshToken(tenantId, rawToken) {
        const key = this.refreshTokenKey(tenantId, rawToken);
        await this.sessionRedis.del(key);
    }
    async revokeTokenFamily(tenantId, family) {
        const key = this.familyRevokeKey(tenantId, family);
        await this.sessionRedis.setex(key, constants_1.REDIS_TTL_SECONDS.SESSION_REFRESH_TOKEN, '1');
        this.logger.warn(`Token family revoked — tenantId: ${tenantId} family: ${family}`);
    }
    async revokeAllIdentitySessions(tenantId, identityId) {
        const sessionSetKey = this.sessionSetKey(tenantId, identityId);
        const rawTokens = await this.sessionRedis.smembers(sessionSetKey);
        if (rawTokens.length === 0)
            return;
        const pipeline = this.sessionRedis.pipeline();
        for (const rawToken of rawTokens) {
            pipeline.del(this.refreshTokenKey(tenantId, rawToken));
        }
        pipeline.del(sessionSetKey);
        await pipeline.exec();
        this.logger.log(`Revoked ${rawTokens.length} session(s) — identityId: ${identityId} tenantId: ${tenantId}`);
    }
    async blacklistToken(tenantId, jti, ttlSeconds) {
        const key = this.blacklistKey(tenantId, jti);
        await this.cacheRedis.setex(key, ttlSeconds, '1');
    }
    async isTokenBlacklisted(tenantId, jti) {
        const key = this.blacklistKey(tenantId, jti);
        const exists = await this.cacheRedis.exists(key);
        return exists === 1;
    }
    refreshTokenKey(tenantId, rawToken) {
        return `spancle:${tenantId}:refresh:${(0, utils_1.sha256)(rawToken)}`;
    }
    blacklistKey(tenantId, jti) {
        return `spancle:${tenantId}:blacklist:${jti}`;
    }
    familyRevokeKey(tenantId, family) {
        return `spancle:${tenantId}:revoked_family:${family}`;
    }
    sessionSetKey(tenantId, identityId) {
        return `spancle:${tenantId}:sessions:${identityId}`;
    }
};
exports.AuthRepository = AuthRepository;
exports.AuthRepository = AuthRepository = AuthRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], AuthRepository);
//# sourceMappingURL=auth.repository.js.map