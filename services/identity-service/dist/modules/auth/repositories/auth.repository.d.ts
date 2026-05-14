import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RefreshTokenRecord } from '../types/auth-request.types';
/**
 * AuthRepository — Redis-backed persistence for auth tokens and sessions.
 *
 * Uses two separate Redis logical databases:
 *   DB 1 (SESSION) — refresh tokens, session records
 *   DB 0 (CACHE)   — access token blacklist (jti blocklist)
 *
 * Key namespacing:
 *   Refresh token:    spancle:{tenantId}:refresh:{sha256(rawToken)}
 *   Blacklist:        spancle:{tenantId}:blacklist:{jti}
 *   Family revoke:    spancle:{tenantId}:revoked_family:{family}
 *   Identity sessions: spancle:{tenantId}:sessions:{identityId}
 *
 * All keys are tenant-namespaced — no cross-tenant read is possible.
 * Raw refresh tokens are SHA-256 hashed before use as Redis keys —
 * the key itself never contains the token value.
 */
export declare class AuthRepository implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private sessionRedis;
    private cacheRedis;
    constructor(config: ConfigService);
    onModuleInit(): void;
    /**
     * Stores a refresh token record in Redis.
     * The raw token is hashed before use as the key — never stored as-is.
     */
    storeRefreshToken(tenantId: string, rawToken: string, record: RefreshTokenRecord, ttlSeconds: number): Promise<void>;
    /**
     * Retrieves a refresh token record by raw token value.
     * Returns null if not found or expired.
     */
    getRefreshToken(tenantId: string, rawToken: string): Promise<RefreshTokenRecord | null>;
    /**
     * Deletes a refresh token (consumes it on rotation or logout).
     */
    deleteRefreshToken(tenantId: string, rawToken: string): Promise<void>;
    /**
     * Revokes all tokens belonging to a specific rotation family.
     * Sets a family-revocation marker that JwtStrategy checks during validation.
     */
    revokeTokenFamily(tenantId: string, family: string): Promise<void>;
    /**
     * Revokes all active sessions for an identity (e.g. password change, suspension).
     */
    revokeAllIdentitySessions(tenantId: string, identityId: string): Promise<void>;
    /**
     * Adds a JTI to the blacklist with TTL matching remaining token validity.
     * JwtStrategy checks this on every request.
     */
    blacklistToken(tenantId: string, jti: string, ttlSeconds: number): Promise<void>;
    /**
     * Returns true if the given JTI has been blacklisted.
     */
    isTokenBlacklisted(tenantId: string, jti: string): Promise<boolean>;
    private refreshTokenKey;
    private blacklistKey;
    private familyRevokeKey;
    private sessionSetKey;
}
//# sourceMappingURL=auth.repository.d.ts.map