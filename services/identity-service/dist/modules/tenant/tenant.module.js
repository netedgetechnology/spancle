"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tenant_controller_1 = require("./controllers/tenant.controller");
const tenant_service_1 = require("./services/tenant.service");
const tenant_cache_service_1 = require("./services/tenant-cache.service");
const tenant_repository_1 = require("./repositories/tenant.repository");
const tenant_entity_1 = require("./entities/tenant.entity");
const tenant_status_guard_1 = require("./guards/tenant-status.guard");
const plan_limit_guard_1 = require("./guards/plan-limit.guard");
const plan_restriction_middleware_1 = require("./middleware/plan-restriction.middleware");
const request_context_provider_1 = require("../../common/context/request-context.provider");
const tenant_resolver_middleware_1 = require("../../common/middleware/tenant-resolver.middleware");
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
let TenantModule = class TenantModule {
    configure(consumer) {
        // Full tenant resolution — runs after TenantContextMiddleware
        consumer
            .apply(tenant_resolver_middleware_1.TenantResolverMiddleware)
            .forRoutes('*');
        // Plan restriction — resource creation enforcement
        consumer
            .apply(plan_restriction_middleware_1.PlanRestrictionMiddleware)
            .forRoutes({ path: 'users', method: 3 }, // POST
        { path: 'academies', method: 3 }, { path: 'bookings', method: 3 }, { path: 'tournaments', method: 3 });
    }
};
exports.TenantModule = TenantModule;
exports.TenantModule = TenantModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([tenant_entity_1.TenantEntity])],
        controllers: [tenant_controller_1.TenantController],
        providers: [
            tenant_service_1.TenantService,
            tenant_cache_service_1.TenantCacheService,
            tenant_repository_1.TenantRepository,
            tenant_status_guard_1.TenantStatusGuard,
            plan_limit_guard_1.PlanLimitGuard,
            plan_restriction_middleware_1.PlanRestrictionMiddleware,
            request_context_provider_1.RequestContextProvider,
        ],
        exports: [
            tenant_service_1.TenantService,
            tenant_cache_service_1.TenantCacheService,
            tenant_repository_1.TenantRepository,
            tenant_status_guard_1.TenantStatusGuard,
            plan_limit_guard_1.PlanLimitGuard,
            request_context_provider_1.RequestContextProvider,
        ],
    })
], TenantModule);
//# sourceMappingURL=tenant.module.js.map