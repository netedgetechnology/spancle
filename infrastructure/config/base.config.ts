import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const NodeEnvSchema = z.enum(['development', 'staging', 'production', 'test']);

const BaseConfigSchema = z.object({

  // ── Runtime ────────────────────────────────────────────────────────────────
  NODE_ENV:     NodeEnvSchema.default('development'),
  LOG_LEVEL:    z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
  SERVICE_NAME: z.string().min(1).default('spancle-service'),
  PORT:         z.coerce.number().int().min(1024).max(65535).default(3000),

  // ── Multi-tenancy ──────────────────────────────────────────────────────────
  TENANT_HEADER:              z.string().default('x-tenant-id'),
  TENANT_RESOLUTION_STRATEGY: z.enum(['header', 'subdomain', 'path', 'jwt']).default('header'),

  // ── PostgreSQL ─────────────────────────────────────────────────────────────
  DATABASE_URL:                     z.string().url().startsWith('postgresql://'),
  DATABASE_POOL_MIN:                z.coerce.number().int().min(0).default(1),
  DATABASE_POOL_MAX:                z.coerce.number().int().min(1).default(5),
  DATABASE_POOL_IDLE_TIMEOUT_MS:    z.coerce.number().int().min(1000).default(30000),
  DATABASE_CONNECTION_TIMEOUT_MS:   z.coerce.number().int().min(500).default(5000),
  DATABASE_SSL:                     z.coerce.boolean().default(false),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z.coerce.boolean().default(true),

  // ── Redis ──────────────────────────────────────────────────────────────────
  REDIS_HOST:     z.string().min(1).default('localhost'),
  REDIS_PORT:     z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS:      z.coerce.boolean().default(false),
  REDIS_DB_CACHE:  z.coerce.number().int().min(0).max(15).default(0),
  REDIS_DB_SESSION: z.coerce.number().int().min(0).max(15).default(1),
  REDIS_DB_QUEUE:   z.coerce.number().int().min(0).max(15).default(2),
  REDIS_DB_PUBSUB:  z.coerce.number().int().min(0).max(15).default(3),

  // ── JWT / Auth ─────────────────────────────────────────────────────────────
  JWT_SECRET:                  z.string().min(32),
  JWT_ACCESS_TOKEN_EXPIRY:     z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY:    z.string().default('7d'),
  JWT_ISSUER:                  z.string().default('spancle-sports-os'),
  JWT_SECRET_PREVIOUS:         z.string().optional(),

  // ── CORS ───────────────────────────────────────────────────────────────────
  CORS_ORIGINS:     z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),

  // ── Rate limiting ──────────────────────────────────────────────────────────
  RATE_LIMIT_TTL_MS:       z.coerce.number().int().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(100),

  // ── Encryption ────────────────────────────────────────────────────────────
  ENCRYPTION_KEY:         z.string().regex(/^[0-9a-f]{64}$/, 'Must be 64-char hex (32 bytes)'),
  ENCRYPTION_KEY_VERSION: z.string().default('v1'),

  // ── Audit ──────────────────────────────────────────────────────────────────
  AUDIT_LOG_ENABLED:        z.coerce.boolean().default(true),
  AUDIT_LOG_DRIVER:         z.enum(['database', 'elasticsearch', 'file']).default('database'),
  AUDIT_LOG_RETENTION_DAYS: z.coerce.number().int().min(1).default(365),

  // ── SMTP ───────────────────────────────────────────────────────────────────
  SMTP_HOST:   z.string().default('localhost'),
  SMTP_PORT:   z.coerce.number().int().default(1025),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER:   z.string().optional(),
  SMTP_PASS:   z.string().optional(),
  SMTP_FROM:   z.string().email().default('noreply@spancle.io'),

  // ── Storage ────────────────────────────────────────────────────────────────
  STORAGE_DRIVER:     z.enum(['local', 's3', 'gcs']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),

  // ── Monitoring ─────────────────────────────────────────────────────────────
  SENTRY_DSN:                  z.string().optional(),
  SENTRY_ENVIRONMENT:          z.string().default('development'),
  SENTRY_TRACES_SAMPLE_RATE:   z.coerce.number().min(0).max(1).default(0.1),

  // ── Internal service URLs ──────────────────────────────────────────────────
  IDENTITY_SERVICE_URL:       z.string().url().default('http://localhost:3001'),
  SAAS_PLATFORM_SERVICE_URL:  z.string().url().default('http://localhost:3002'),
  BOOKING_SERVICE_URL:        z.string().url().default('http://localhost:3003'),
  FINANCE_SERVICE_URL:        z.string().url().default('http://localhost:3004'),
  TOURNAMENT_SERVICE_URL:     z.string().url().default('http://localhost:3005'),
  ACADEMY_SERVICE_URL:        z.string().url().default('http://localhost:3006'),
  COMMUNICATION_SERVICE_URL:  z.string().url().default('http://localhost:3007'),
  REPORTING_SERVICE_URL:      z.string().url().default('http://localhost:3008'),
});

export type BaseConfig = z.infer<typeof BaseConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Env file loader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Loads an environment-specific .env file from infrastructure/environments/.
 * Falls back silently if the file does not exist (process.env wins).
 *
 * Load order (later entries win):
 *   1. infrastructure/environments/.env.{NODE_ENV}
 *   2. .env (root — local dev convenience override)
 *   3. process.env (always wins — injected by PM2 or shell)
 */
function loadEnvFile(nodeEnv: string): void {
  const envDir = path.resolve(
    __dirname,
    '../environments',
  );

  const candidates = [
    path.join(envDir, `.env.${nodeEnv}`),
    path.resolve(process.cwd(), '.env'),
  ];

  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      const raw  = fs.readFileSync(filePath, 'utf8');
      const lines = raw.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;

        const key   = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim();

        // process.env takes precedence — do not overwrite
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config factory — used by NestJS ConfigModule.forRoot()
// ─────────────────────────────────────────────────────────────────────────────

/**
 * validateAndLoadConfig()
 *
 * Called once at bootstrap inside each NestJS service.
 * Throws a descriptive error on startup if any required var is missing
 * or malformed — prevents the service from entering a partially-broken state.
 *
 * Usage in AppModule:
 *   ConfigModule.forRoot({
 *     isGlobal: true,
 *     validate:  validateAndLoadConfig,
 *   })
 */
export function validateAndLoadConfig(
  rawEnv: Record<string, unknown>,
): BaseConfig {
  const nodeEnv = (rawEnv['NODE_ENV'] ?? process.env['NODE_ENV'] ?? 'development') as string;

  // Load file-based env vars before Zod validation
  loadEnvFile(nodeEnv);

  // Merge file-loaded vars into rawEnv for validation
  const merged = { ...process.env, ...rawEnv };

  const result = BaseConfigSchema.safeParse(merged);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  [${i.path.join('.')}] ${i.message}`)
      .join('\n');

    throw new Error(
      `\n\n🚫  Spancle Sports OS — Configuration validation failed\n` +
      `Service: ${merged['SERVICE_NAME'] ?? 'unknown'}\n` +
      `Environment: ${nodeEnv}\n\n` +
      `Missing or invalid variables:\n${issues}\n\n` +
      `Check infrastructure/environments/.env.${nodeEnv}\n`,
    );
  }

  return result.data;
}

/**
 * Type-safe config accessor factory.
 * Returns a typed accessor for a subset of config keys.
 *
 * Usage:
 *   const db = configAccessor(config, 'DATABASE_URL', 'DATABASE_POOL_MAX');
 *   db('DATABASE_URL') // typed as string
 */
export function configAccessor<
  T extends BaseConfig,
  K extends keyof T,
>(config: T, ..._keys: K[]): (key: K) => T[K] {
  return (key: K) => config[key];
}
