import { type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { Request } from 'express';
import { type TenantRuntimeRequest } from '../../modules/tenant/types/tenant-context.types';
import { TenantCacheService } from '../../modules/tenant/services/tenant-cache.service';
import { TenantService } from '../../modules/tenant/services/tenant.service';
/**
 * TenantResolverMiddleware — the full-resolution layer.
 *
 * Unlike TenantContextMiddleware (which only extracts the raw tenantId),
 * this middleware performs a complete resolution:
 *
 *   1. STRATEGY SELECTION — determines how to resolve tenant identity:
 *      a. Header   → x-tenant-id (UUID)                 [default]
 *      b. Subdomain → acme.app.spancle.io → slug lookup  [web apps]
 *      c. JWT       → tenantId extracted from access token payload
 *
 *   2. CACHE LOOKUP — checks Redis for a warm TenantContextRuntime
 *
 *   3. DATABASE FALLBACK — if cache miss, loads from PostgreSQL via TenantService
 *
 *   4. STATUS VALIDATION — active/trial tenants pass; suspended/terminated
 *      short-circuit here before any business logic runs
 *
 *   5. CONTEXT ATTACHMENT — attaches TenantContextRuntime to:
 *      a. request[TENANT_RUNTIME_KEY]  → for REQUEST-scoped DI
 *      b. TenantClsContext.run()       → for implicit async propagation
 *
 *   6. RESPONSE HEADER — sets x-tenant-id on response for tracing
 *
 * Registration order in AppModule:
 *   TenantContextMiddleware (raw extraction)
 *   → TenantResolverMiddleware (full resolution)
 *   → Guard chain (TenantGuard, JwtAuthGuard, ...)
 *
 * Routes that bypass resolution (health, metrics):
 *   Apply to all routes EXCEPT /health and /metrics.
 */
export declare class TenantResolverMiddleware implements NestMiddleware {
    private readonly tenantCache;
    private readonly tenantService;
    private readonly logger;
    private readonly tenantHeader;
    private readonly baseDomain;
    private readonly strategy;
    private readonly uuidPattern;
    constructor(tenantCache: TenantCacheService, tenantService: TenantService);
    use(request: Request & TenantRuntimeRequest, response: Response, next: NextFunction): Promise<void>;
    private extractTenantIdentifier;
    /**
     * Header strategy — expects a UUID tenant ID in x-tenant-id header.
     * Used by: API clients, internal service-to-service calls, mobile apps.
     */
    private extractFromHeader;
    /**
     * Subdomain strategy — extracts tenant slug from the request hostname.
     * acme.app.spancle.io → slug='acme' → resolved to tenantId via DB/cache.
     *
     * Used by: web portals, white-label consumer apps.
     *
     * Custom domains (e.g. portal.acme-sports.com) are resolved in Sprint 3
     * via a domain routing table — currently returns null for unknown domains.
     */
    private extractFromSubdomain;
    /**
     * JWT strategy — extracts tenantId from the Bearer token payload.
     * Used by: internal service mesh, server-to-server API calls.
     * Falls back to header strategy if token is absent or unparseable.
     *
     * NOTE: This does NOT verify the JWT signature — that is JwtAuthGuard's job.
     * We only read the tenantId claim here for resolution purposes.
     */
    private extractFromJwt;
    private resolveFromCache;
    private resolveFromDatabase;
    private shouldSkip;
}
//# sourceMappingURL=tenant-resolver.middleware.d.ts.map