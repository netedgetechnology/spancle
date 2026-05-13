/**
 * Redis Constants
 * Key namespacing and DB index assignments.
 *
 * DB layout:
 *   DB 0 — Application cache (tenant data, query results)
 *   DB 1 — Session store (JWT refresh tokens, active sessions)
 *   DB 2 — Job queues (BullMQ)
 *   DB 3 — Pub/Sub (internal domain events)
 */

export const REDIS_DB = {
  CACHE:   0,
  SESSION: 1,
  QUEUE:   2,
  PUBSUB:  3,
} as const;

export const REDIS_TTL_SECONDS = {
  SESSION_ACCESS_TOKEN:  15 * 60,            // 15 min
  SESSION_REFRESH_TOKEN: 7 * 24 * 60 * 60,   // 7 days
  CACHE_SHORT:           60,                 // 1 min
  CACHE_MEDIUM:          5 * 60,             // 5 min
  CACHE_LONG:            60 * 60,            // 1 hour
  CACHE_DAY:             24 * 60 * 60,       // 24 hours
  RATE_LIMIT:            60,                 // 1 min window
  EMAIL_VERIFY_TOKEN:    24 * 60 * 60,       // 24 hours
  PASSWORD_RESET_TOKEN:  60 * 60,            // 1 hour
  IDEMPOTENCY_KEY:       24 * 60 * 60,       // 24 hours
} as const;

/**
 * Redis key builder — enforces consistent key namespacing.
 *
 * Pattern: spancle:{tenantId}:{domain}:{entity}:{id}
 */
export const RedisKeys = {
  session: (tenantId: string, userId: string) =>
    `spancle:${tenantId}:session:${userId}`,

  refreshToken: (tenantId: string, tokenId: string) =>
    `spancle:${tenantId}:refresh_token:${tokenId}`,

  emailVerify: (tenantId: string, tokenId: string) =>
    `spancle:${tenantId}:email_verify:${tokenId}`,

  passwordReset: (tenantId: string, tokenId: string) =>
    `spancle:${tenantId}:password_reset:${tokenId}`,

  rateLimitUser: (tenantId: string, userId: string, endpoint: string) =>
    `spancle:${tenantId}:rate_limit:user:${userId}:${endpoint}`,

  rateLimitIp: (ip: string, endpoint: string) =>
    `spancle:rate_limit:ip:${ip}:${endpoint}`,

  tenantConfig: (tenantId: string) =>
    `spancle:${tenantId}:config`,

  idempotencyKey: (tenantId: string, key: string) =>
    `spancle:${tenantId}:idempotency:${key}`,
} as const;
