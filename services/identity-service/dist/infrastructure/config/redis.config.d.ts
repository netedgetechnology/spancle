import { type ConfigService } from '@nestjs/config';
import type { BaseConfig } from './base.config';
import Redis from 'ioredis';
export declare function createRedisClient(config: ConfigService<BaseConfig, true>, _purpose: string): Redis;
//# sourceMappingURL=redis.config.d.ts.map