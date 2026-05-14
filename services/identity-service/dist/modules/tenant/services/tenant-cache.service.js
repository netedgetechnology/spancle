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
const TENANT_CACHE_TTL = constants_1.REDIS_TTL_SECONDS.CACHE_MEDIUM; // 5 minutes
/**
 * TenantCacheService — Redis-backed cache for resolved TenantContextRuntime.
 *
 * Why cache:
 *   - Every authenticated request triggers tenant resolution
 *   - Without cache: 1 DB round-trip per request per tenant
 *   - With cache: resolved in <1ms from Redis DB0
 *
 * Invalidation triggers (all flush the tenant's cache entry):
 *   - TENANT_UPDATED         → settings may have changed
 *   - TENANT_TIER_CHANGED    → plan limits changed (critical)
 *   - TENANT_ACTIVATED       → status changed
 *   - TENANT_SUSPENDED       → status changed (security critical — immediate flush)
 *   - TENANT_TERMINATED      → status changed
 *
 * TTL: 5 minutes for normal status. Suspended/terminated tenants cached
 * for only 60 seconds — ensures re-activation propagates quickly.
 */
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
    // ── Cache operations ───────────────────────────────────────────────────────
    async get(tenantId) {
        const key = this.key(tenantId);
        const data = await this.redis.get(key);
        if (!data)
            return null;
        try {
            const parsed = JSON.parse(data);
            // Rehydrate Date — JSON.parse gives a string
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
    // ── Event-driven invalidation ──────────────────────────────────────────────
    async onTenantUpdated(payload) {
        await this.invalidate(payload.tenantId);
    }
    async onTierChanged(payload) {
        // Tier change affects plan limits — immediate flush required
        await this.invalidate(payload.tenantId);
        this.logger.log(`Tier changed — flushed tenant cache: ${payload.tenantId}`);
    }
    async onTenantActivated(payload) {
        await this.invalidate(payload.tenantId);
    }
    async onTenantSuspended(payload) {
        // Suspension is security-critical — must propagate within one cache TTL
        await this.invalidate(payload.tenantId);
        this.logger.warn(`Tenant suspended — flushed tenant cache: ${payload.tenantId}`);
    }
    async onTenantTerminated(payload) {
        await this.invalidate(payload.tenantId);
        this.logger.warn(`Tenant terminated — flushed tenant cache: ${payload.tenantId}`);
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    key(tenantId) {
        return `${TENANT_CACHE_PREFIX}${tenantId}`;
    }
    resolveTtl(runtime) {
        // Degraded tenants get a short TTL so re-activation propagates quickly
        if (runtime.status === 'suspended' || runtime.status === 'terminated') {
            return constants_1.REDIS_TTL_SECONDS.CACHE_SHORT; // 60s
        }
        return TENANT_CACHE_TTL; // 5 min
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