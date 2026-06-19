import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantModule }       from './modules/tenant/tenant.module';
import { PackageModule }      from './modules/package/package.module';
import { SubscriptionModule }  from './modules/subscription/subscription.module';
import { PlanModule }          from './modules/plan/plan.module';
import { CmsModule }           from './modules/cms/cms.module';
import { AdminModule }          from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),

    // JwtModule provides JwtService — used by JwtAuthGuard to verify
    // Bearer tokens issued by identity-service. Same JWT_SECRET, no
    // gateway/header-injection layer is involved.
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          issuer: config.get<string>('JWT_ISSUER', 'spancle-sports-os'),
        },
      }),
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
        extra: {
          max: config.get<number>('DATABASE_POOL_MAX', 10),
          idleTimeoutMillis: config.get<number>('DATABASE_POOL_IDLE_TIMEOUT_MS', 30000),
        },
        ssl: config.get('DATABASE_SSL') === 'true'
          ? { rejectUnauthorized: config.get('DATABASE_SSL_REJECT_UNAUTHORIZED') !== 'false' }
          : false,
      }),
    }),

    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('RATE_LIMIT_TTL_MS', 60000),
          limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
        }],
      }),
    }),

    TenantModule, PackageModule, SubscriptionModule, PlanModule, CmsModule, AdminModule,
  ],
  providers: [
    // Global JWT auth guard — enforces authentication on all CMS admin endpoints.
    // Routes marked @Public() bypass this guard (public website rendering).
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
