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
var TenantCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantCacheService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const event_emitter_1 = require("@nestjs/event-emitter");
const ioredis_1 = require("ioredis");
const constants_1 = require("@spancle/constants");
const TENANT_CACHE_PREFIX = 'spancle:tenant_runtime:';
const TENANT_CACHE_TTL = constants_1.REDIS_TTL_SECONDS.CACHE_MEDIUM;
let TenantCacheService = TenantCacheService_1 = class TenantCacheService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(TenantCacheService_1.name);
    }
    onModuleInit() {
        this.redis = new ioredis_1.Redis({
            host: this.config.get('REDIS_HOST', 'localhost'),
            port: this.config.get('REDIS_PORT', 6379),
            password: this.config.get('REDIS_PASSWORD'),
            db: constants_1.REDIS_DB.CACHE,
            tls: this.config.get('REDIS_TLS') === 'true' ? {} : undefined,
            lazyConnect: false,
        });
        this.redis.on('error', (err) => this.logger.error(`TenantCache Redis error: ${String(err)}`));
    }
    async get(tenantId) {
        const key = this.key(tenantId);
        const data = await this.redis.get(key);
        if (!data)
            return null;
        try {
            const parsed = JSON.parse(data);
            return { ...parsed, resolvedAt: new Date(parsed.resolvedAt), fromCache: true };
        }
        catch (err) {
            this.logger.warn(`Failed to parse cached tenant ${tenantId}: ${String(err)}`);
            await this.redis.del(key);
            return null;
        }
    }
    async set(runtime) {
        const key = this.key(runtime.tenantId);
        const ttl = this.resolveTtl(runtime);
        await this.redis.setex(key, ttl, JSON.stringify(runtime));
        this.logger.debug(`Cached tenant ${runtime.tenantId} (${runtime.slug}) — ttl: ${ttl}s tier: ${runtime.tier}`);
    }
    async invalidate(tenantId) {
        const key = this.key(tenantId);
        const deleted = await this.redis.del(key);
        this.logger.log(`Cache invalidated for tenant ${tenantId} — deleted: ${deleted}`);
    }
    async invalidateMany(tenantIds) {
        if (tenantIds.length === 0)
            return;
        const pipeline = this.redis.pipeline();
        for (const tenantId of tenantIds) {
            pipeline.del(this.key(tenantId));
        }
        await pipeline.exec();
        this.logger.log(`Bulk cache invalidated — ${tenantIds.length} tenants`);
    }
    async onTenantUpdated(payload) {
        await this.invalidate(payload.tenantId);
    }
    async onTierChanged(payload) {
        await this.invalidate(payload.tenantId);
        this.logger.log(`Tier changed — flushed tenant cache: ${payload.tenantId}`);
    }
    async onTenantActivated(payload) {
        await this.invalidate(payload.tenantId);
    }
    async onTenantSuspended(payload) {
        await this.invalidate(payload.tenantId);
        this.logger.warn(`Tenant suspended — flushed tenant cache: ${payload.tenantId}`);
    }
    async onTenantTerminated(payload) {
        await this.invalidate(payload.tenantId);
        this.logger.warn(`Tenant terminated — flushed tenant cache: ${payload.tenantId}`);
    }
    key(tenantId) {
        return `${TENANT_CACHE_PREFIX}${tenantId}`;
    }
    resolveTtl(runtime) {
        if (runtime.status === 'suspended' || runtime.status === 'terminated') {
            return constants_1.REDIS_TTL_SECONDS.CACHE_SHORT;
        }
        return TENANT_CACHE_TTL;
    }
};
exports.TenantCacheService = TenantCacheService;
__decorate([
    (0, event_emitter_1.OnEvent)('spancle.tenant.updated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantCacheService.prototype, "onTenantUpdated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('spancle.tenant.tier_changed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantCacheService.prototype, "onTierChanged", null);
__decorate([
    (0, event_emitter_1.OnEvent)('spancle.tenant.activated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantCacheService.prototype, "onTenantActivated", null);
__decorate([
    (0, event_emitter_1.OnEvent)('spancle.tenant.suspended'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantCacheService.prototype, "onTenantSuspended", null);
__decorate([
    (0, event_emitter_1.OnEvent)('spancle.tenant.terminated'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TenantCacheService.prototype, "onTenantTerminated", null);
exports.TenantCacheService = TenantCacheService = TenantCacheService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TenantCacheService);
//# sourceMappingURL=tenant-cache.service.js.map