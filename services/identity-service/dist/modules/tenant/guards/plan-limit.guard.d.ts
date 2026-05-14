import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PlanFeatureFlags } from '../types/plan-limits.types';
export declare const REQUIRED_FEATURE_KEY: "spancle:required_feature";
export declare const REQUIRED_TIER_KEY: "spancle:required_tier";
/**
 * @RequiresFeature('apiAccess') — route is only accessible if the tenant's
 * plan includes the named feature flag.
 *
 * Usage:
 *   @RequiresFeature('advancedAnalytics')
 *   @Get('analytics/advanced')
 *   getAdvancedAnalytics() { ... }
 */
export declare const RequiresFeature: (feature: keyof PlanFeatureFlags) => MethodDecorator;
/**
 * @RequiresTier('pro') — route requires the tenant to be on at least
 * the specified tier (or higher).
 *
 * Usage:
 *   @RequiresTier('growth')
 *   @Post('webhooks')
 *   createWebhook() { ... }
 */
export declare const RequiresTier: (tier: string) => MethodDecorator;
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
export declare class PlanLimitGuard implements CanActivate {
    private readonly reflector;
    private readonly logger;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=plan-limit.guard.d.ts.map