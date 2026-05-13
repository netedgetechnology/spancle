import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RbacGuard } from './common/guards/rbac.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';

import { ReportModule }     from './modules/report/report.module';
import { DashboardModule }  from './modules/dashboard/dashboard.module';
import { MetricModule }     from './modules/metric/metric.module';
import { AnalyticsModule }  from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),

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

    ReportModule, DashboardModule, MetricModule, AnalyticsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: RbacGuard },
  ],
})
export class AppModule {}
