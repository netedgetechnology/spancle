import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { TenantContextRuntime } from '../types/tenant-context.types';
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
export declare class TenantCacheService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private redis;
    constructor(config: ConfigService);
    onModuleInit(): void;
    get(tenantId: string): Promise<TenantContextRuntime | null>;
    set(runtime: TenantContextRuntime): Promise<void>;
    invalidate(tenantId: string): Promise<void>;
    invalidateMany(tenantIds: string[]): Promise<void>;
    onTenantUpdated(payload: {
        tenantId: string;
    }): Promise<void>;
    onTierChanged(payload: {
        tenantId: string;
    }): Promise<void>;
    onTenantActivated(payload: {
        tenantId: string;
    }): Promise<void>;
    onTenantSuspended(payload: {
        tenantId: string;
    }): Promise<void>;
    onTenantTerminated(payload: {
        tenantId: string;
    }): Promise<void>;
    private key;
    private resolveTtl;
}
//# sourceMappingURL=tenant-cache.service.d.ts.map