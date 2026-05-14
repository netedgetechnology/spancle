"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisKeys = exports.REDIS_TTL_SECONDS = exports.REDIS_DB = void 0;
exports.REDIS_DB = {
    CACHE: 0,
    SESSION: 1,
    QUEUE: 2,
    PUBSUB: 3,
};
exports.REDIS_TTL_SECONDS = {
    SESSION_ACCESS_TOKEN: 15 * 60, // 15 min
    SESSION_REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
    CACHE_SHORT: 60, // 1 min
    CACHE_MEDIUM: 5 * 60, // 5 min
    CACHE_LONG: 60 * 60, // 1 hour
    CACHE_DAY: 24 * 60 * 60, // 24 hours
    RATE_LIMIT: 60, // 1 min window
    EMAIL_VERIFY_TOKEN: 24 * 60 * 60, // 24 hours
    PASSWORD_RESET_TOKEN: 60 * 60, // 1 hour
    IDEMPOTENCY_KEY: 24 * 60 * 60, // 24 hours
};
/**
 * Redis key builder — enforces consistent key namespacing.
 *
 * Pattern: spancle:{tenantId}:{domain}:{entity}:{id}
 */
exports.RedisKeys = {
    session: (tenantId, userId) => `spancle:${tenantId}:session:${userId}`,
    refreshToken: (tenantId, tokenId) => `spancle:${tenantId}:refresh_token:${tokenId}`,
    emailVerify: (tenantId, tokenId) => `spancle:${tenantId}:email_verify:${tokenId}`,
    passwordReset: (tenantId, tokenId) => `spancle:${tenantId}:password_reset:${tokenId}`,
    rateLimitUser: (tenantId, userId, endpoint) => `spancle:${tenantId}:rate_limit:user:${userId}:${endpoint}`,
    rateLimitIp: (ip, endpoint) => `spancle:rate_limit:ip:${ip}:${endpoint}`,
    tenantConfig: (tenantId) => `spancle:${tenantId}:config`,
    idempotencyKey: (tenantId, key) => `spancle:${tenantId}:idempotency:${key}`,
};
//# sourceMappingURL=redis.constants.js.map