import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  TENANT_RUNTIME_KEY,
  tenantHasFeature,
  type TenantRuntimeRequest,
} from '../types/tenant-context.types';
import type { PlanFeatureFlags } from '../types/plan-limits.types';
import { IS_PUBLIC_KEY } from '../../../common/decorators/roles.decorator';

// ── Metadata keys ──────────────────────────────────────────────────────────────

export const REQUIRED_FEATURE_KEY  = 'spancle:required_feature'  as const;
export const REQUIRED_TIER_KEY     = 'spancle:required_tier'     as const;

// ── Tier hierarchy ─────────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = {
  free:       0,
  starter:    1,
  growth:     2,
  pro:        3,
  enterprise: 4,
};

// ── Decorators ─────────────────────────────────────────────────────────────────

/**
 * @RequiresFeature('apiAccess') — route is only accessible if the tenant's
 * plan includes the named feature flag.
 *
 * Usage:
 *   @RequiresFeature('advancedAnalytics')
 *   @Get('analytics/advanced')
 *   getAdvancedAnalytics() { ... }
 */
export const RequiresFeature = (feature: keyof PlanFeatureFlags): MethodDecorator =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);

/**
 * @RequiresTier('pro') — route requires the tenant to be on at least
 * the specified tier (or higher).
 *
 * Usage:
 *   @RequiresTier('growth')
 *   @Post('webhooks')
 *   createWebhook() { ... }
 */
export const RequiresTier = (tier: string): MethodDecorator =>
  SetMetadata(REQUIRED_TIER_KEY, tier);

// ── Guard ──────────────────────────────────────────────────────────────────────

/**
 * PlanLimitGuard — enforces plan-based access restrictions.
 *
 * Evaluates two types of restrictions:
 *   1. @RequiresFeature() — boolean feature flag check against plan
 *   2. @RequiresTier()    — minimum tier check using TIER_RANK hierarchy
 *
 * Both checks are OR'd per decorator but AND'd across multiple decorators.
 *
 * Execution position: after TenantStatusGuard, before RolesGuard.
 *
 * When a tenant is denied:
 *   - 403 Forbidden with a clear upgrade message
 *   - Event emitted for analytics (Sprint 3 — upsell tracking)
 */
@Injectable()
export class PlanLimitGuard implements CanActivate {
  private readonly logger = new Logger(PlanLimitGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const request = context
      .switchToHttp()
      .getRequest<TenantRuntimeRequest>();

    const runtime = request[TENANT_RUNTIME_KEY];

    // No runtime context — let other guards handle
    if (!runtime) return true;

    // ── Feature flag check ───────────────────────────────────────────────────
    const requiredFeature = this.reflector.getAllAndOverride<keyof PlanFeatureFlags>(
      REQUIRED_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredFeature) {
      const hasFeature = tenantHasFeature(runtime, requiredFeature);

      if (!hasFeature) {
        this.logger.warn(
          `Plan restriction — feature "${requiredFeature}" not available on ` +
          `tier "${runtime.tier}" for tenant ${runtime.tenantId}`,
        );
        throw new ForbiddenException(
          `This feature requires a higher plan. ` +
          `Current plan: ${runtime.tier}. ` +
          `Please upgrade to access "${String(requiredFeature)}".`,
        );
      }
    }

    // ── Minimum tier check ───────────────────────────────────────────────────
    const requiredTier = this.reflector.getAllAndOverride<string>(
      REQUIRED_TIER_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredTier) {
      const tenantRank   = TIER_RANK[runtime.tier]   ?? 0;
      const requiredRank = TIER_RANK[requiredTier]    ?? 0;

      if (tenantRank < requiredRank) {
        this.logger.warn(
          `Plan restriction — tier "${requiredTier}" required, ` +
          `tenant "${runtime.tenantId}" is on "${runtime.tier}"`,
        );
        throw new ForbiddenException(
          `This feature requires the "${requiredTier}" plan or higher. ` +
          `Your current plan is "${runtime.tier}". Please upgrade to continue.`,
        );
      }
    }

    return true;
  }
}
