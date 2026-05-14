import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule }        from './modules/auth/auth.module';
import { IdentityModule }    from './modules/identity/identity.module';
import { UserModule }        from './modules/user/user.module';
import { RoleModule }        from './modules/role/role.module';
import { TenantModule }      from './modules/tenant/tenant.module';
import { OnboardingModule }  from './modules/onboarding/onboarding.module';
import { BranchModule }      from './modules/branch/branch.module';
import { SportModule }       from './modules/sport/sport.module';
import { CourtModule }       from './modules/court/court.module';

import { TenantGuard }              from './common/guards/tenant.guard';
import { JwtAuthGuard }             from './common/guards/jwt-auth.guard';
import { RolesGuard }               from './common/guards/roles.guard';
import { PermissionsGuard }         from './common/guards/permissions.guard';
import { TenantStatusGuard }        from './modules/tenant/guards/tenant-status.guard';
import { PlanLimitGuard }           from './modules/tenant/guards/plan-limit.guard';
import { TenantContextMiddleware }  from './common/middleware/tenant-context.middleware';
import { TenantContextInterceptor } from './common/interceptors/tenant-context.interceptor';

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
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),

    TypeOrmModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        type:             'postgres',
        url:              config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize:      false,
        logging:          config.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
        extra: {
          max:               config.get<number>('DATABASE_POOL_MAX', 10),
          idleTimeoutMillis: config.get<number>('DATABASE_POOL_IDLE_TIMEOUT_MS', 30000),
        },
        ssl: config.get('DATABASE_SSL') === 'true'
          ? { rejectUnauthorized: config.get('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false' }
          : false,
      }),
    }),

    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),

    ThrottlerModule.forRootAsync({
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl:   config.get<number>('RATE_LIMIT_TTL_MS', 60_000),
          limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
        }],
      }),
    }),

    // Domain modules
    TenantModule,
    AuthModule,
    IdentityModule,
    UserModule,
    RoleModule,
    OnboardingModule,
    BranchModule,
    SportModule,
    CourtModule,
  ],

  providers: [
    // ── Global guards — order = enforcement order ──────────────────────────
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantStatusGuard },
    { provide: APP_GUARD, useClass: PlanLimitGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },

    // ── Global interceptors ────────────────────────────────────────────────
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
})
export class AppModule implements NestModule {
  /**
   * Middleware pipeline — runs before guard chain.
   * TenantResolverMiddleware is registered inside TenantModule.configure().
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
