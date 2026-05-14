import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TenantController }         from './controllers/tenant.controller';
import { TenantService }            from './services/tenant.service';
import { TenantCacheService }       from './services/tenant-cache.service';
import { TenantRepository }         from './repositories/tenant.repository';
import { TenantEntity }             from './entities/tenant.entity';
import { TenantStatusGuard }        from './guards/tenant-status.guard';
import { PlanLimitGuard }           from './guards/plan-limit.guard';
import { PlanRestrictionMiddleware } from './middleware/plan-restriction.middleware';

import { RequestContextProvider }   from '../../common/context/request-context.provider';
import { TenantResolverMiddleware }  from '../../common/middleware/tenant-resolver.middleware';

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
@Module({
  imports: [TypeOrmModule.forFeature([TenantEntity])],

  controllers: [TenantController],

  providers: [
    TenantService,
    TenantCacheService,
    TenantRepository,
    TenantStatusGuard,
    PlanLimitGuard,
    PlanRestrictionMiddleware,
    RequestContextProvider,
  ],

  exports: [
    TenantService,
    TenantCacheService,
    TenantRepository,
    TenantStatusGuard,
    PlanLimitGuard,
    RequestContextProvider,
  ],
})
export class TenantModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Full tenant resolution — runs after TenantContextMiddleware
    consumer
      .apply(TenantResolverMiddleware)
      .forRoutes('*');

    // Plan restriction — resource creation enforcement
    consumer
      .apply(PlanRestrictionMiddleware)
      .forRoutes(
        { path: 'users',       method: 3 },   // POST
        { path: 'academies',   method: 3 },
        { path: 'bookings',    method: 3 },
        { path: 'tournaments', method: 3 },
      );
  }
}
