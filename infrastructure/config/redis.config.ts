import { Redis, type RedisOptions } from 'ioredis';
import type { ConfigService } from '@nestjs/config';
import type { BaseConfig } from './base.config';

/**
 * Redis logical DB assignments.
 *
 * Single Redis instance on the same server as the application.
 * Logical DBs provide namespace isolation — not process isolation.
 * For true isolation, separate Redis instances would be needed (Sprint 6).
 *
 *   DB 0 — Cache           : tenant configs, query results, short-lived data
 *   DB 1 — Session store   : JWT refresh tokens, active session records
 *   DB 2 — Job queues      : BullMQ job data and result sets
 *   DB 3 — Pub/Sub         : internal domain event bus
 */
export type RedisDb = 'cache' | 'session' | 'queue' | 'pubsub';

const DB_INDEX: Record<RedisDb, keyof BaseConfig> = {
  cache:   'REDIS_DB_CACHE',
  session: 'REDIS_DB_SESSION',
  queue:   'REDIS_DB_QUEUE',
  pubsub:  'REDIS_DB_PUBSUB',
};

/**
 * redisBaseOptions()
 *
 * Returns shared ioredis connection options derived from validated config.
 * All service Redis clients are constructed from this base.
 */
export function redisBaseOptions(
  config: ConfigService<BaseConfig, true>,
  db: RedisDb,
): RedisOptions {
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const isProduction = nodeEnv === 'production' || nodeEnv === 'staging';

  const dbKey  = DB_INDEX[db];
  const dbIndex = config.get(dbKey as keyof BaseConfig, { infer: true }) as number;

  return {
    host:     config.get('REDIS_HOST', { infer: true }),
    port:     config.get('REDIS_PORT', { infer: true }),
    password: config.get('REDIS_PASSWORD', { infer: true }) || undefined,
    db:       dbIndex,

    // TLS — required in staging and production
    tls: config.get('REDIS_TLS', { infer: true }) ? {} : undefined,

    // Connection name visible in CLIENT LIST
    connectionName: `spancle-${config.get('SERVICE_NAME', { infer: true })}:${db}`,

    // Lazy connect — don't connect until first command
    lazyConnect: false,

    // Keep-alive — prevents NAT timeouts on long-lived connections
    keepAlive: 30000,

    // Command timeout — fail fast rather than hang indefinitely
    commandTimeout: 5000,

    // Retry strategy — exponential backoff, capped at 30s
    retryStrategy: (times: number): number | null => {
      // Give up after 10 consecutive failures in production
      if (isProduction && times > 10) {
        return null; // Stop retrying — PM2 will restart the service
      }
      // Stop retrying after 5 attempts in development
      if (!isProduction && times > 5) {
        return null;
      }
      // Exponential backoff: 100ms, 200ms, 400ms ... max 30s
      return Math.min(100 * Math.pow(2, times - 1), 30_000);
    },

    // Reconnect on error — reconnect on ECONNRESET and ETIMEDOUT
    reconnectOnError: (err: Error): boolean => {
      const reconnectErrors = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED'];
      return reconnectErrors.some((e) => err.message.includes(e));
    },

    // Max retries per request — prevents cascading failures
    maxRetriesPerRequest: isProduction ? 3 : 1,

    // Enable offline queue — buffer commands during reconnect
    enableOfflineQueue: true,

    // Read-only mode — not used in single-node setup (future: Redis replicas)
    readOnly: false,
  };
}

/**
 * createRedisClient()
 *
 * Factory — creates a typed ioredis client for a specific logical DB.
 * Attaches standard event handlers for observability.
 *
 * Usage in a NestJS service (OnModuleInit):
 *   this.redis = createRedisClient(configService, 'cache');
 */
export function createRedisClient(
  config: ConfigService<BaseConfig, true>,
  db: RedisDb,
): Redis {
  const options = redisBaseOptions(config, db);
  const client  = new Redis(options);
  const label   = `Redis[${db}]`;

  client.on('connect', () => {
    // Use process.stdout to avoid circular dependency with Logger
    process.stdout.write(`${label} connected — ${options.host}:${options.port} db:${options.db}\n`);
  });

  client.on('ready', () => {
    process.stdout.write(`${label} ready\n`);
  });

  client.on('error', (err: Error) => {
    process.stderr.write(`${label} error: ${err.message}\n`);
  });

  client.on('close', () => {
    process.stderr.write(`${label} connection closed\n`);
  });

  client.on('reconnecting', () => {
    process.stdout.write(`${label} reconnecting...\n`);
  });

  return client;
}

/**
 * redisHealthCheck()
 *
 * Pings a Redis client and returns latency in ms.
 * Used by the health check endpoint in each service.
 *
 * Usage:
 *   const latency = await redisHealthCheck(this.redisClient);
 */
export async function redisHealthCheck(client: Redis): Promise<number> {
  const start = Date.now();
  await client.ping();
  return Date.now() - start;
}

/**
 * bullMqRedisOptions()
 *
 * Returns ioredis connection options compatible with BullMQ.
 * BullMQ requires a fresh connection — do not reuse the app client.
 *
 * Used by: booking-service, finance-service, communication-service
 */
export function bullMqRedisOptions(
  config: ConfigService<BaseConfig, true>,
): RedisOptions {
  return {
    ...redisBaseOptions(config, 'queue'),
    // BullMQ requirement: maxRetriesPerRequest must be null
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
