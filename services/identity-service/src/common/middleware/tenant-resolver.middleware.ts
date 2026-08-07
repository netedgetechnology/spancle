import {
  Injectable,
  type NestMiddleware,
  Logger,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { Request } from 'express';
import { TENANT_HEADER, TENANT_RESOLUTION_STRATEGIES } from '@spancle/constants';
import {
  TENANT_RUNTIME_KEY,
  createTenantContextRuntime,
  isTenantActive,
  type TenantRuntimeRequest,
  type TenantContextRuntime,
} from '../../modules/tenant/types/tenant-context.types';
import { TenantClsContext } from '../context/tenant-cls.context';
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
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  private readonly tenantHeader: string =
    process.env['TENANT_HEADER'] ?? TENANT_HEADER;

  private readonly baseDomain: string =
    process.env['NEXT_PUBLIC_BASE_DOMAIN'] ?? 'app.spancle.io';

  private readonly strategy: string =
    process.env['TENANT_RESOLUTION_STRATEGY'] ??
    TENANT_RESOLUTION_STRATEGIES.HEADER;

  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor(
    private readonly tenantCache:   TenantCacheService,
    private readonly tenantService: TenantService,
  ) {}

  async use(
    request: Request & TenantRuntimeRequest,
    response: Response,
    next: NextFunction,
  ): Promise<void> {
    // Skip resolution on infra routes
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

      // Cache-first resolution
      let runtime = await this.resolveFromCache(tenantIdentifier);

      // Database fallback
      if (!runtime) {
        runtime = await this.resolveFromDatabase(tenantIdentifier);
        if (runtime) {
          await this.tenantCache.set(runtime);
        }
      }

      if (!runtime) {
        this.logger.warn(
          `Tenant not found for identifier "${tenantIdentifier}" — path: ${request.path}`,
        );
        throw new UnauthorizedException('Tenant not found');
      }

      // Status gate — suspended/terminated tenants get 503 not 401
      if (!isTenantActive(runtime)) {
        this.logger.warn(
          `Blocked request for ${runtime.status} tenant: ${runtime.tenantId} — path: ${request.path}`,
        );
        throw new ServiceUnavailableException(
          `Tenant account is ${runtime.status}. Please contact support.`,
        );
      }

      // Attach to request object for REQUEST-scoped DI
      request[TENANT_RUNTIME_KEY] = runtime;

      // Set response header for distributed tracing
      response.setHeader('x-tenant-id', runtime.tenantId);
      response.setHeader('x-tenant-slug', runtime.slug);

      // Propagate through CLS for implicit async context
      TenantClsContext.run(runtime, () => next());

    } catch (err) {
      if (
        err instanceof UnauthorizedException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      this.logger.error(
        `TenantResolverMiddleware error on path ${request.path}: ${String(err)}`,
      );
      next(err);
    }
  }

  // ── Strategy: identifier extraction ───────────────────────────────────────

  private extractTenantIdentifier(request: Request): string | null {
    switch (this.strategy) {
      case TENANT_RESOLUTION_STRATEGIES.HEADER:
        return this.extractFromHeader(request);

      case TENANT_RESOLUTION_STRATEGIES.SUBDOMAIN:
        return this.extractFromSubdomain(request) ?? this.extractFromHeader(request);

      case TENANT_RESOLUTION_STRATEGIES.JWT:
        return this.extractFromJwt(request) ?? this.extractFromHeader(request);

      default:
        return this.extractFromHeader(request);
    }
  }

  /**
   * Header strategy — expects a UUID tenant ID in x-tenant-id header.
   * Used by: API clients, internal service-to-service calls, mobile apps.
   */
  private extractFromHeader(request: Request): string | null {
    const value = request.headers[this.tenantHeader];
    if (!value || typeof value !== 'string') return null;
    if (!this.uuidPattern.test(value)) return null;
    return value;
  }

  /**
   * Subdomain strategy — extracts tenant slug from the request hostname.
   * acme.app.spancle.io → slug='acme' → resolved to tenantId via DB/cache.
   *
   * Used by: web portals, white-label consumer apps.
   *
   * Custom domains (e.g. portal.acme-sports.com) are resolved in Sprint 3
   * via a domain routing table — currently returns null for unknown domains.
   */
  private extractFromSubdomain(request: Request): string | null {
    const hostname = request.hostname;

    // Local dev override via header
    const devSlug = request.headers['x-tenant-slug'];
    if (devSlug && typeof devSlug === 'string') return devSlug;

    const withoutBase = hostname.replace(`.${this.baseDomain}`, '');

    if (withoutBase === hostname) return null;      // No subdomain match
    if (withoutBase === 'www' || withoutBase === 'api') return null;

    return withoutBase;
  }

  /**
   * JWT strategy — extracts tenantId from the Bearer token payload.
   * Used by: internal service mesh, server-to-server API calls.
   * Falls back to header strategy if token is absent or unparseable.
   *
   * NOTE: This does NOT verify the JWT signature — that is JwtAuthGuard's job.
   * We only read the tenantId claim here for resolution purposes.
   */
  private extractFromJwt(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.slice(7);
    try {
      const parts   = token.split('.');
      if (parts.length !== 3 || !parts[1]) return null;

      const padded  = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
      const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as {
        tenantId?: string;
      };

      if (payload.tenantId && this.uuidPattern.test(payload.tenantId)) {
        return payload.tenantId;
      }
    } catch {
      // Malformed token — fall through to next strategy
    }

    return null;
  }

  // ── Resolution helpers ─────────────────────────────────────────────────────

  private async resolveFromCache(
    identifier: string,
  ): Promise<TenantContextRuntime | null> {
    // UUID lookup (header/JWT strategy)
    if (this.uuidPattern.test(identifier)) {
      return this.tenantCache.get(identifier);
    }
    // Slug lookup — cache keyed by tenantId not slug, so DB required
    return null;
  }

  private async resolveFromDatabase(
    identifier: string,
  ): Promise<TenantContextRuntime | null> {
    try {
      let tenant;

      if (this.uuidPattern.test(identifier)) {
        tenant = await this.tenantService.findById(identifier);
      } else {
        // Slug-based resolution (subdomain strategy)
        tenant = await this.tenantService.findBySlug(identifier);
      }

      if (!tenant) return null;

      return createTenantContextRuntime({
        tenantId:   tenant.id,
        slug:       tenant.slug,
        name:       tenant.name,
        status:     tenant.status,
        tier:       tenant.tier,
        settings:   tenant.settings,
        planLimits: await this.tenantService.resolvePlanLimits(tenant.tier),
        fromCache:  false,
      });
    } catch (err) {
      this.logger.error(
        `Database resolution failed for "${identifier}": ${String(err)}`,
      );
      return null;
    }
  }

  private shouldSkip(path: string): boolean {
    const skipPaths = ['/health', '/metrics', '/favicon.ico', '/_next'];
    if (skipPaths.some((p) => path.startsWith(p))) return true;

    // Superadmin tenant-management routes operate across all tenants and
    // have no single tenant context. Resolution would fail because the
    // superadmin portal sends a platform UUID that does not exist as a
    // row in the tenants table.
    // Auth and RBAC (JwtAuthGuard + @Roles('SUPER_ADMIN')) still apply.
    if (path.startsWith('/api/v1/tenants')) return true;

    return false;
  }
}
