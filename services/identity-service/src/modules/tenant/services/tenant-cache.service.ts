import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Redis } from 'ioredis';
import { REDIS_DB, REDIS_TTL_SECONDS } from '@spancle/constants';
import type { TenantContextRuntime } from '../types/tenant-context.types';

const TENANT_CACHE_PREFIX = 'spancle:tenant_runtime:';
const TENANT_CACHE_TTL    = REDIS_TTL_SECONDS.CACHE_MEDIUM; // 5 minutes

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
@Injectable()
export class TenantCacheService implements OnModuleInit {
  private readonly logger = new Logger(TenantCacheService.name);
  private redis!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.redis = new Redis({
      host:     this.config.get<string>('REDIS_HOST', 'localhost'),
      port:     this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      db:       REDIS_DB.CACHE,
      tls:      this.config.get('REDIS_TLS') === 'true' ? {} : undefined,
      lazyConnect: false,
    });

    this.redis.on('error', (err) =>
      this.logger.error(`TenantCache Redis error: ${String(err)}`),
    );
  }

  // ── Cache operations ───────────────────────────────────────────────────────

  async get(tenantId: string): Promise<TenantContextRuntime | null> {
    const key  = this.key(tenantId);
    const data = await this.redis.get(key);

    if (!data) return null;

    try {
      const parsed = JSON.parse(data) as TenantContextRuntime & { resolvedAt: string };
      // Rehydrate Date — JSON.parse gives a string
      return { ...parsed, resolvedAt: new Date(parsed.resolvedAt), fromCache: true };
    } catch (err) {
      this.logger.warn(`Failed to parse cached tenant ${tenantId}: ${String(err)}`);
      await this.redis.del(key);
      return null;
    }
  }

  async set(runtime: TenantContextRuntime): Promise<void> {
    const key = this.key(runtime.tenantId);
    const ttl = this.resolveTtl(runtime);

    await this.redis.setex(key, ttl, JSON.stringify(runtime));

    this.logger.debug(
      `Cached tenant ${runtime.tenantId} (${runtime.slug}) — ttl: ${ttl}s tier: ${runtime.tier}`,
    );
  }

  async invalidate(tenantId: string): Promise<void> {
    const key     = this.key(tenantId);
    const deleted = await this.redis.del(key);

    this.logger.log(
      `Cache invalidated for tenant ${tenantId} — deleted: ${deleted}`,
    );
  }

  async invalidateMany(tenantIds: string[]): Promise<void> {
    if (tenantIds.length === 0) return;

    const pipeline = this.redis.pipeline();
    for (const tenantId of tenantIds) {
      pipeline.del(this.key(tenantId));
    }
    await pipeline.exec();

    this.logger.log(`Bulk cache invalidated — ${tenantIds.length} tenants`);
  }

  // ── Event-driven invalidation ──────────────────────────────────────────────

  @OnEvent('spancle.tenant.updated')
  async onTenantUpdated(payload: { tenantId: string }): Promise<void> {
    await this.invalidate(payload.tenantId);
  }

  @OnEvent('spancle.tenant.tier_changed')
  async onTierChanged(payload: { tenantId: string }): Promise<void> {
    // Tier change affects plan limits — immediate flush required
    await this.invalidate(payload.tenantId);
    this.logger.log(`Tier changed — flushed tenant cache: ${payload.tenantId}`);
  }

  @OnEvent('spancle.tenant.activated')
  async onTenantActivated(payload: { tenantId: string }): Promise<void> {
    await this.invalidate(payload.tenantId);
  }

  @OnEvent('spancle.tenant.suspended')
  async onTenantSuspended(payload: { tenantId: string }): Promise<void> {
    // Suspension is security-critical — must propagate within one cache TTL
    await this.invalidate(payload.tenantId);
    this.logger.warn(`Tenant suspended — flushed tenant cache: ${payload.tenantId}`);
  }

  @OnEvent('spancle.tenant.terminated')
  async onTenantTerminated(payload: { tenantId: string }): Promise<void> {
    await this.invalidate(payload.tenantId);
    this.logger.warn(`Tenant terminated — flushed tenant cache: ${payload.tenantId}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private key(tenantId: string): string {
    return `${TENANT_CACHE_PREFIX}${tenantId}`;
  }

  private resolveTtl(runtime: TenantContextRuntime): number {
    // Degraded tenants get a short TTL so re-activation propagates quickly
    if (runtime.status === 'suspended' || runtime.status === 'terminated') {
      return REDIS_TTL_SECONDS.CACHE_SHORT; // 60s
    }
    return TENANT_CACHE_TTL; // 5 min
  }
}
