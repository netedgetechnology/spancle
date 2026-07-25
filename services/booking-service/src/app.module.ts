import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { TenantGuard, RbacGuard } from './modules/booking/guards/booking.guard';
import { GuestModule }         from './modules/guest/guest.module';
import { BookingRulesModule }  from './modules/booking-rules/booking-rules.module';
import { PaymentModule }       from './modules/payment/payment.module';
import { EventBusModule }      from './common/event-bus/event-bus.module';
import { BookingModule }    from './modules/booking/booking.module';
import { SlotModule }       from './modules/slot/slot.module';
import { VenueModule }      from './modules/venue/venue.module';
import { CourtModule }      from './modules/court/court.module';
import { QrModule }         from './modules/qr/qr.module';
import { MembershipModule } from './modules/membership/membership.module';
import { FinanceModule }    from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),

    JwtModule.registerAsync({
      global:  true,
      inject:  [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:      config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { issuer: config.get<string>('JWT_ISSUER', 'spancle-sports-os') },
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
    ScheduleModule.forRoot(),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{
          ttl: config.get<number>('RATE_LIMIT_TTL_MS', 60000),
          limit: config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
        }],
      }),
    }),

    BookingModule, SlotModule, VenueModule, CourtModule, QrModule, MembershipModule,
    EventBusModule,
    GuestModule,
    BookingRulesModule,
    PaymentModule,
  ],
  providers: [
    // Global guard chain for all booking-service routes:
    // 1. ThrottlerGuard — rate limiting (configured per-route with @Throttle)
    // 2. TenantGuard    — validates x-tenant-id header
    // 3. RbacGuard      — validates x-actor-role against @Roles() metadata
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: TenantGuard    },
    { provide: APP_GUARD, useClass: RbacGuard      },
  ],
})
export class AppModule {}
