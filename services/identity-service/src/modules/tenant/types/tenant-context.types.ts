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
  readonly tenantId:    string;
  readonly slug:        string;
  readonly name:        string;
  readonly status:      TenantStatus;
  readonly tier:        TenantTier;
  readonly settings:    TenantSettings;
  readonly planLimits:  PlanLimits;
  readonly resolvedAt:  Date;
  readonly fromCache:   boolean;
}

/**
 * Symbol used to attach TenantContextRuntime to the Express request object.
 * Using a Symbol prevents key collision with other middleware.
 */
export const TENANT_RUNTIME_KEY = Symbol('spancle:tenant_runtime');

/**
 * Typed extension of Express Request carrying the runtime context.
 */
export interface TenantRuntimeRequest {
  [TENANT_RUNTIME_KEY]?: TenantContextRuntime;
}

/**
 * Factory — creates a frozen TenantContextRuntime.
 */
export function createTenantContextRuntime(
  params: Omit<TenantContextRuntime, 'resolvedAt'> & { resolvedAt?: Date },
): TenantContextRuntime {
  const runtime: TenantContextRuntime = {
    ...params,
    resolvedAt: params.resolvedAt ?? new Date(),
  };
  return Object.freeze(runtime);
}

/**
 * Feature gate check — returns true if the tenant's plan includes a feature.
 */
export function tenantHasFeature(
  ctx: TenantContextRuntime,
  feature: keyof TenantContextRuntime['planLimits']['features'],
): boolean {
  return ctx.planLimits.features[feature] === true;
}

/**
 * Resource limit check — returns true if the tenant is within their limit
 * for the given resource. Treats -1 as unlimited.
 */
export function tenantWithinLimit(
  ctx: TenantContextRuntime,
  resource: keyof TenantContextRuntime['planLimits']['resources'],
  currentCount: number,
): boolean {
  const limit = ctx.planLimits.resources[resource];
  if (limit === -1) return true;          // Unlimited (Enterprise)
  return currentCount < limit;
}

/**
 * Status helpers
 */
export function isTenantActive(ctx: TenantContextRuntime): boolean {
  return ctx.status === 'active' || ctx.status === 'trial';
}

export function isTenantSuspended(ctx: TenantContextRuntime): boolean {
  return ctx.status === 'suspended';
}

export function isTenantTerminated(ctx: TenantContextRuntime): boolean {
  return ctx.status === 'terminated';
}
