import { type ConfigService } from '@nestjs/config';
import type { BaseConfig } from './base.config';
import Redis from 'ioredis';

export function createRedisClient(
  config: ConfigService<BaseConfig, true>,
  _purpose: string,
): Redis {
  return new Redis({
    host:     config.get('REDIS_HOST',     { infer: true }) ?? 'localhost',
    port:     Number(config.get('REDIS_PORT', { infer: true }) ?? 6379),
    password: config.get('REDIS_PASSWORD', { infer: true }) as string | undefined,
    db:       Number(config.get('REDIS_DB_CACHE', { infer: true }) ?? 0),
    lazyConnect: true,
  });
}
