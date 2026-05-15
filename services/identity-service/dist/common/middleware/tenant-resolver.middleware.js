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
var TenantResolverMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantResolverMiddleware = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("@spancle/constants");
const tenant_context_types_1 = require("../../modules/tenant/types/tenant-context.types");
const tenant_cls_context_1 = require("../context/tenant-cls.context");
const tenant_cache_service_1 = require("../../modules/tenant/services/tenant-cache.service");
const tenant_service_1 = require("../../modules/tenant/services/tenant.service");
let TenantResolverMiddleware = TenantResolverMiddleware_1 = class TenantResolverMiddleware {
    constructor(tenantCache, tenantService) {
        this.tenantCache = tenantCache;
        this.tenantService = tenantService;
        this.logger = new common_1.Logger(TenantResolverMiddleware_1.name);
        this.tenantHeader = process.env['TENANT_HEADER'] ?? constants_1.TENANT_HEADER;
        this.baseDomain = process.env['NEXT_PUBLIC_BASE_DOMAIN'] ?? 'app.spancle.io';
        this.strategy = process.env['TENANT_RESOLUTION_STRATEGY'] ??
            constants_1.TENANT_RESOLUTION_STRATEGIES.HEADER;
        this.uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    }
    async use(request, response, next) {
        if (this.shouldSkip(request.path)) {
            next();
            return;
        }
        try {
            const tenantIdentifier = this.extractTenantIdentifier(request);
            if (!tenantIdentifier) {
                next();
                return;
            }
            let runtime = await this.resolveFromCache(tenantIdentifier);
            if (!runtime) {
                runtime = await this.resolveFromDatabase(tenantIdentifier);
                if (runtime) {
                    await this.tenantCache.set(runtime);
                }
            }
            if (!runtime) {
                this.logger.warn(`Tenant not found for identifier "${tenantIdentifier}" — path: ${request.path}`);
                throw new common_1.UnauthorizedException('Tenant not found');
            }
            if (!(0, tenant_context_types_1.isTenantActive)(runtime)) {
                this.logger.warn(`Blocked request for ${runtime.status} tenant: ${runtime.tenantId} — path: ${request.path}`);
                throw new common_1.ServiceUnavailableException(`Tenant account is ${runtime.status}. Please contact support.`);
            }
            request[tenant_context_types_1.TENANT_RUNTIME_KEY] = runtime;
            response.setHeader('x-tenant-id', runtime.tenantId);
            response.setHeader('x-tenant-slug', runtime.slug);
            tenant_cls_context_1.TenantClsContext.run(runtime, () => next());
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException ||
                err instanceof common_1.ServiceUnavailableException) {
                throw err;
            }
            this.logger.error(`TenantResolverMiddleware error on path ${request.path}: ${String(err)}`);
            next(err);
        }
    }
    extractTenantIdentifier(request) {
        switch (this.strategy) {
            case constants_1.TENANT_RESOLUTION_STRATEGIES.HEADER:
                return this.extractFromHeader(request);
            case constants_1.TENANT_RESOLUTION_STRATEGIES.SUBDOMAIN:
                return this.extractFromSubdomain(request) ?? this.extractFromHeader(request);
            case constants_1.TENANT_RESOLUTION_STRATEGIES.JWT:
                return this.extractFromJwt(request) ?? this.extractFromHeader(request);
            default:
                return this.extractFromHeader(request);
        }
    }
    extractFromHeader(request) {
        const value = request.headers[this.tenantHeader];
        if (!value || typeof value !== 'string')
            return null;
        if (!this.uuidPattern.test(value))
            return null;
        return value;
    }
    extractFromSubdomain(request) {
        const hostname = request.hostname;
        const devSlug = request.headers['x-tenant-slug'];
        if (devSlug && typeof devSlug === 'string')
            return devSlug;
        const withoutBase = hostname.replace(`.${this.baseDomain}`, '');
        if (withoutBase === hostname)
            return null;
        if (withoutBase === 'www' || withoutBase === 'api')
            return null;
        return withoutBase;
    }
    extractFromJwt(request) {
        const authHeader = request.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer '))
            return null;
        const token = authHeader.slice(7);
        try {
            const parts = token.split('.');
            if (parts.length !== 3 || !parts[1])
                return null;
            const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
            const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
            if (payload.tenantId && this.uuidPattern.test(payload.tenantId)) {
                return payload.tenantId;
            }
        }
        catch {
        }
        return null;
    }
    async resolveFromCache(identifier) {
        if (this.uuidPattern.test(identifier)) {
            return this.tenantCache.get(identifier);
        }
        return null;
    }
    async resolveFromDatabase(identifier) {
        try {
            let tenant;
            if (this.uuidPattern.test(identifier)) {
                tenant = await this.tenantService.findById(identifier);
            }
            else {
                tenant = await this.tenantService.findBySlug(identifier);
            }
            if (!tenant)
                return null;
            return (0, tenant_context_types_1.createTenantContextRuntime)({
                tenantId: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                status: tenant.status,
                tier: tenant.tier,
                settings: tenant.settings,
                planLimits: await this.tenantService.resolvePlanLimits(tenant.tier),
                fromCache: false,
            });
        }
        catch (err) {
            this.logger.error(`Database resolution failed for "${identifier}": ${String(err)}`);
            return null;
        }
    }
    shouldSkip(path) {
        const skipPaths = ['/health', '/metrics', '/favicon.ico', '/_next'];
        return skipPaths.some((p) => path.startsWith(p));
    }
};
exports.TenantResolverMiddleware = TenantResolverMiddleware;
exports.TenantResolverMiddleware = TenantResolverMiddleware = TenantResolverMiddleware_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_cache_service_1.TenantCacheService,
        tenant_service_1.TenantService])
], TenantResolverMiddleware);
//# sourceMappingURL=tenant-resolver.middleware.js.map