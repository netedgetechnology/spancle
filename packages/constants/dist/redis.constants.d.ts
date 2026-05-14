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
export declare const REDIS_DB: {
    readonly CACHE: 0;
    readonly SESSION: 1;
    readonly QUEUE: 2;
    readonly PUBSUB: 3;
};
export declare const REDIS_TTL_SECONDS: {
    readonly SESSION_ACCESS_TOKEN: number;
    readonly SESSION_REFRESH_TOKEN: number;
    readonly CACHE_SHORT: 60;
    readonly CACHE_MEDIUM: number;
    readonly CACHE_LONG: number;
    readonly CACHE_DAY: number;
    readonly RATE_LIMIT: 60;
    readonly EMAIL_VERIFY_TOKEN: number;
    readonly PASSWORD_RESET_TOKEN: number;
    readonly IDEMPOTENCY_KEY: number;
};
/**
 * Redis key builder — enforces consistent key namespacing.
 *
 * Pattern: spancle:{tenantId}:{domain}:{entity}:{id}
 */
export declare const RedisKeys: {
    readonly session: (tenantId: string, userId: string) => string;
    readonly refreshToken: (tenantId: string, tokenId: string) => string;
    readonly emailVerify: (tenantId: string, tokenId: string) => string;
    readonly passwordReset: (tenantId: string, tokenId: string) => string;
    readonly rateLimitUser: (tenantId: string, userId: string, endpoint: string) => string;
    readonly rateLimitIp: (ip: string, endpoint: string) => string;
    readonly tenantConfig: (tenantId: string) => string;
    readonly idempotencyKey: (tenantId: string, key: string) => string;
};
//# sourceMappingURL=redis.constants.d.ts.map