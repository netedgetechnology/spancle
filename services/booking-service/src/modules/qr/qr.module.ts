import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule }    from '@nestjs/typeorm';
import { CacheModule }      from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore      from 'cache-manager-ioredis';

import { QrTokenEntity }    from './entities/qr-token.entity';
import { QrScanLogEntity }  from './entities/qr-scan-log.entity';

import { QrTokenRepository }  from './repositories/qr-token.repository';
import { QrGenerationService } from './services/qr-generation.service';
import { QrValidationService } from './services/qr-validation.service';
import { QrController }        from './controllers/qr.controller';

import { BookingModule }       from '../booking/booking.module';

/**
 * QrModule — QR token issuance, validation, and smart-access verification.
 *
 * Imports BookingModule for:
 *   BookingRepository  — booking existence / status checks
 *   BookingService     — triggers checkIn() on successful scan
 *
 * CacheModule: Redis-backed, scoped to this module.
 *   Keys:  tenant:{tenantId}:qr:{tokenHash} — issued token metadata
 *          qr:verify:{tokenHash}             — public verify cache
 *   TTL: inherits token expiresAt, capped at 24 h.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([QrTokenEntity, QrScanLogEntity]),
    CacheModule.registerAsync({
      imports:    [ConfigModule],
      inject:     [ConfigService],
      useFactory: (config: ConfigService) => ({
        store:    redisStore,
        host:     config.get<string>('REDIS_HOST', 'localhost'),
        port:     config.get<number>('REDIS_PORT', 6379),
        password: config.get<string>('REDIS_PASSWORD', ''),
        db:       config.get<number>('REDIS_DB_CACHE', 0),
        ttl:      86_400, // 24h default TTL (seconds)
        max:      500,
      }),
    }),
    forwardRef(() => BookingModule),
  ],
  controllers: [QrController],
  providers: [
    QrTokenRepository,
    QrGenerationService,
    QrValidationService,
  ],
  exports: [QrGenerationService, QrValidationService],
})
export class QrModule {}
