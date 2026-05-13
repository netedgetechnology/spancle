import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { ConfigService } from '@nestjs/config';
import type { BaseConfig } from './base.config';

/**
 * databaseConfig()
 *
 * TypeORM connection factory for all NestJS services.
 * Consumed in AppModule:
 *
 *   TypeOrmModule.forRootAsync({
 *     inject:     [ConfigService],
 *     useFactory: databaseConfig,
 *   })
 *
 * Connection strategy:
 *   - Single PostgreSQL instance on the same server
 *   - Per-service pool capped at DATABASE_POOL_MAX (default: 5)
 *   - 8 services × 5 connections = 40 max connections
 *   - PostgreSQL max_connections should be set ≥ 100 (leaves headroom)
 *   - SSL enabled in staging/production via DATABASE_SSL=true
 *   - Row-Level Security enforced at migration layer — not here
 *   - synchronize: false always — migrations are the only schema authority
 *
 * Logging:
 *   - development: ['query', 'error', 'warn'] — full query visibility
 *   - staging:     ['error', 'warn', 'migration']
 *   - production:  ['error', 'migration'] — minimal noise
 */
export function databaseConfig(
  config: ConfigService<BaseConfig, true>,
): TypeOrmModuleOptions {
  const nodeEnv = config.get('NODE_ENV', { infer: true });
  const isProduction = nodeEnv === 'production';
  const isTest       = nodeEnv === 'test';

  const logging = (): TypeOrmModuleOptions['logging'] => {
    switch (nodeEnv) {
      case 'development': return ['query', 'error', 'warn', 'migration'];
      case 'staging':     return ['error', 'warn', 'migration'];
      case 'production':  return ['error', 'migration'];
      case 'test':        return false;
      default:            return ['error'];
    }
  };

  const sslEnabled = config.get('DATABASE_SSL', { infer: true });

  return {
    type: 'postgres',

    // DSN — injected by PM2 or provisioned via env file
    url: config.get('DATABASE_URL', { infer: true }),

    // Entity discovery — each service calls autoLoadEntities via TypeOrmModule.forFeature
    autoLoadEntities: true,

    // Never alter schema — migrations only
    synchronize: false,

    // Logging
    logging: logging(),

    // Connection pool — deliberately conservative for single-server deployment
    extra: {
      // Minimum idle connections kept warm
      min: isTest ? 1 : config.get('DATABASE_POOL_MIN', { infer: true }),

      // Hard ceiling per service
      max: isTest ? 2 : config.get('DATABASE_POOL_MAX', { infer: true }),

      // How long a connection can sit idle before being closed
      idleTimeoutMillis: config.get('DATABASE_POOL_IDLE_TIMEOUT_MS', { infer: true }),

      // How long to wait for a connection to be acquired
      connectionTimeoutMillis: config.get('DATABASE_CONNECTION_TIMEOUT_MS', { infer: true }),

      // Statement timeout — prevents runaway queries (5s in production)
      statement_timeout: isProduction ? 5000 : 0,

      // Application name visible in pg_stat_activity
      application_name: config.get('SERVICE_NAME', { infer: true }),
    },

    // SSL — always required in staging and production
    ssl: sslEnabled
      ? {
          rejectUnauthorized: config.get('DATABASE_SSL_REJECT_UNAUTHORIZED', { infer: true }),
        }
      : false,

    // Migrations — path relative to service dist/ output
    migrations: ['dist/migrations/*.js'],

    // Migration table name — unique per service to avoid cross-service conflicts
    migrationsTableName: `typeorm_migrations_${
      (config.get('SERVICE_NAME', { infer: true }) as string)
        .replace(/-/g, '_')
        .replace('@spancle/', '')
    }`,

    // Do NOT run migrations automatically — use dedicated migration script
    migrationsRun: false,

    // Retain connection on query error (don't kill the whole pool)
    retryAttempts: isProduction ? 5 : 2,
    retryDelay:    1000,

    // TypeORM cache — disabled; Redis is used for application-level caching
    cache: false,
  };
}

/**
 * databaseConfigForCli()
 *
 * Standalone DataSource config for TypeORM CLI (migrations).
 * Used in scripts/migrate.sh and ormconfig.ts per service.
 *
 * Example service ormconfig.ts:
 *   import { DataSource } from 'typeorm';
 *   import { databaseConfigForCli } from '../../infrastructure/config/database.config';
 *   export default new DataSource(databaseConfigForCli());
 */
export function databaseConfigForCli(): Record<string, unknown> {
  const nodeEnv = process.env['NODE_ENV'] ?? 'development';

  return {
    type:     'postgres',
    url:      process.env['DATABASE_URL'],
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: `typeorm_migrations_${
      (process.env['SERVICE_NAME'] ?? 'service').replace(/-/g, '_')
    }`,
    ssl: process.env['DATABASE_SSL'] === 'true'
      ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
      : false,
    logging: nodeEnv === 'development' ? ['query', 'error'] : ['error'],
  };
}
