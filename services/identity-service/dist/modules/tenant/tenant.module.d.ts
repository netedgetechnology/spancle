import { MiddlewareConsumer, NestModule } from '@nestjs/common';
/**
 * TenantModule — tenant isolation and lifecycle management.
 *
 * Exports:
 *   TenantService         → for cross-module tenant resolution
 *   TenantCacheService    → for cache invalidation from other modules
 *   TenantStatusGuard     → for use in other module controllers
 *   PlanLimitGuard        → for use in other module controllers
 *   RequestContextProvider → for REQUEST-scoped DI in service methods
 *
 * Middleware registration:
 *   TenantResolverMiddleware runs on all routes (registered here via NestModule)
 *   PlanRestrictionMiddleware runs on resource creation routes
 */
export declare class TenantModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void;
}
//# sourceMappingURL=tenant.module.d.ts.map