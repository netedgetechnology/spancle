import type { TenantStatus, TenantSettings, TenantTier } from '@spancle/types';
import type { PlanLimits } from './plan-limits.types';
/**
 * TenantContextRuntime — the fully-resolved, enriched tenant context
 * available throughout the request lifecycle.
 *
 * Contrast with TenantContext (from @spancle/auth-sdk) which carries
 * only the raw tenantId extracted from the header.
 *
 * TenantContextRuntime is populated by TenantResolverMiddleware after
 * a database/cache lookup and injected via the REQUEST-scoped
 * TenantContextProvider.
 *
 * Immutable after construction — freeze enforced in factory method.
 */
export interface TenantContextRuntime {
    readonly tenantId: string;
    readonly slug: string;
    readonly name: string;
    readonly status: TenantStatus;
    readonly tier: TenantTier;
    readonly settings: TenantSettings;
    readonly planLimits: PlanLimits;
    readonly resolvedAt: Date;
    readonly fromCache: boolean;
}
/**
 * Symbol used to attach TenantContextRuntime to the Express request object.
 * Using a Symbol prevents key collision with other middleware.
 */
export declare const TENANT_RUNTIME_KEY: unique symbol;
/**
 * Typed extension of Express Request carrying the runtime context.
 */
export interface TenantRuntimeRequest {
    [TENANT_RUNTIME_KEY]?: TenantContextRuntime;
}
/**
 * Factory — creates a frozen TenantContextRuntime.
 */
export declare function createTenantContextRuntime(params: Omit<TenantContextRuntime, 'resolvedAt'> & {
    resolvedAt?: Date;
}): TenantContextRuntime;
/**
 * Feature gate check — returns true if the tenant's plan includes a feature.
 */
export declare function tenantHasFeature(ctx: TenantContextRuntime, feature: keyof TenantContextRuntime['planLimits']['features']): boolean;
/**
 * Resource limit check — returns true if the tenant is within their limit
 * for the given resource. Treats -1 as unlimited.
 */
export declare function tenantWithinLimit(ctx: TenantContextRuntime, resource: keyof TenantContextRuntime['planLimits']['resources'], currentCount: number): boolean;
/**
 * Status helpers
 */
export declare function isTenantActive(ctx: TenantContextRuntime): boolean;
export declare function isTenantSuspended(ctx: TenantContextRuntime): boolean;
export declare function isTenantTerminated(ctx: TenantContextRuntime): boolean;
//# sourceMappingURL=tenant-context.types.d.ts.map