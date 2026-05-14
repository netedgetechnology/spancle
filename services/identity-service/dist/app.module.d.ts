import { MiddlewareConsumer, NestModule } from '@nestjs/common';
/**
 * AppModule — identity-service root module.
 *
 * Global guard execution order (guaranteed by APP_GUARD registration order):
 *   1. ThrottlerGuard    — rate limiting, all routes
 *   2. TenantGuard       — header extraction + UUID format validation
 *   3. JwtAuthGuard      — Bearer token validation, sets request.user
 *   4. TenantStatusGuard — blocks suspended/terminated tenants
 *   5. PlanLimitGuard    — enforces @RequiresFeature() / @RequiresTier()
 *   6. RolesGuard        — enforces @Roles() metadata
 *   7. PermissionsGuard  — enforces @RequirePermissions() metadata
 *
 * Global interceptors:
 *   TenantContextInterceptor — stamps x-tenant-* response headers
 *
 * Middleware pipeline (runs before guards):
 *   TenantContextMiddleware   — attaches raw tenantId to request
 *   TenantResolverMiddleware  — full resolution (registered in TenantModule)
 */
export declare class AppModule implements NestModule {
    /**
     * Middleware pipeline — runs before guard chain.
     * TenantResolverMiddleware is registered inside TenantModule.configure().
     */
    configure(consumer: MiddlewareConsumer): void;
}
//# sourceMappingURL=app.module.d.ts.map