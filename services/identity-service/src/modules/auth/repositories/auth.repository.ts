import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_DB, REDIS_TTL_SECONDS } from '@spancle/constants';
import { sha256 } from '@spancle/utils';
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
@Injectable()
export class AuthRepository implements OnModuleInit {
  private readonly logger = new Logger(AuthRepository.name);

  private sessionRedis!: Redis;
  private cacheRedis!:   Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const redisConfig = {
      host:     this.config.get<string>('REDIS_HOST', 'localhost'),
      port:     this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD'),
      tls:      this.config.get('REDIS_TLS') === 'true' ? {} : undefined,
      lazyConnect: false,
    };

    this.sessionRedis = new Redis({ ...redisConfig, db: REDIS_DB.SESSION });
    this.cacheRedis   = new Redis({ ...redisConfig, db: REDIS_DB.CACHE });

    this.sessionRedis.on('error', (err) =>
      this.logger.error(`Session Redis error: ${String(err)}`),
    );
    this.cacheRedis.on('error', (err) =>
      this.logger.error(`Cache Redis error: ${String(err)}`),
    );
  }

  // ── Refresh tokens ─────────────────────────────────────────────────────────

  /**
   * Stores a refresh token record in Redis.
   * The raw token is hashed before use as the key — never stored as-is.
   */
  async storeRefreshToken(
    tenantId:     string,
    rawToken:     string,
    record:       RefreshTokenRecord,
    ttlSeconds:   number,
  ): Promise<void> {
    const key = this.refreshTokenKey(tenantId, rawToken);
    await this.sessionRedis.setex(key, ttlSeconds, JSON.stringify(record));

    // Track token in the identity's session set for bulk revocation
    const sessionSetKey = this.sessionSetKey(tenantId, record.identityId);
    await this.sessionRedis.sadd(sessionSetKey, rawToken);
    await this.sessionRedis.expire(sessionSetKey, ttlSeconds);
  }

  /**
   * Retrieves a refresh token record by raw token value.
   * Returns null if not found or expired.
   */
  async getRefreshToken(
    tenantId: string,
    rawToken: string,
  ): Promise<RefreshTokenRecord | null> {
    const key  = this.refreshTokenKey(tenantId, rawToken);
    const data = await this.sessionRedis.get(key);

    if (!data) return null;

    try {
      return JSON.parse(data) as RefreshTokenRecord;
    } catch {
      this.logger.error(`Failed to parse refresh token record for key ${key}`);
      return null;
    }
  }

  /**
   * Deletes a refresh token (consumes it on rotation or logout).
   */
  async deleteRefreshToken(tenantId: string, rawToken: string): Promise<void> {
    const key = this.refreshTokenKey(tenantId, rawToken);
    await this.sessionRedis.del(key);
  }

  /**
   * Revokes all tokens belonging to a specific rotation family.
   * Sets a family-revocation marker that JwtStrategy checks during validation.
   */
  async revokeTokenFamily(tenantId: string, family: string): Promise<void> {
    const key = this.familyRevokeKey(tenantId, family);
    await this.sessionRedis.setex(
      key,
      REDIS_TTL_SECONDS.SESSION_REFRESH_TOKEN,
      '1',
    );
    this.logger.warn(`Token family revoked — tenantId: ${tenantId} family: ${family}`);
  }

  /**
   * Revokes all active sessions for an identity (e.g. password change, suspension).
   */
  async revokeAllIdentitySessions(
    tenantId:   string,
    identityId: string,
  ): Promise<void> {
    const sessionSetKey = this.sessionSetKey(tenantId, identityId);
    const rawTokens     = await this.sessionRedis.smembers(sessionSetKey);

    if (rawTokens.length === 0) return;

    const pipeline = this.sessionRedis.pipeline();
    for (const rawToken of rawTokens) {
      pipeline.del(this.refreshTokenKey(tenantId, rawToken));
    }
    pipeline.del(sessionSetKey);

    await pipeline.exec();

    this.logger.log(
      `Revoked ${rawTokens.length} session(s) — identityId: ${identityId} tenantId: ${tenantId}`,
    );
  }

  // ── Access token blacklist ─────────────────────────────────────────────────

  /**
   * Adds a JTI to the blacklist with TTL matching remaining token validity.
   * JwtStrategy checks this on every request.
   */
  async blacklistToken(
    tenantId:   string,
    jti:        string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.blacklistKey(tenantId, jti);
    await this.cacheRedis.setex(key, ttlSeconds, '1');
  }

  /**
   * Returns true if the given JTI has been blacklisted.
   */
  async isTokenBlacklisted(tenantId: string, jti: string): Promise<boolean> {
    const key    = this.blacklistKey(tenantId, jti);
    const exists = await this.cacheRedis.exists(key);
    return exists === 1;
  }

  // ── Key builders ───────────────────────────────────────────────────────────

  private refreshTokenKey(tenantId: string, rawToken: string): string {
    return `spancle:${tenantId}:refresh:${sha256(rawToken)}`;
  }

  private blacklistKey(tenantId: string, jti: string): string {
    return `spancle:${tenantId}:blacklist:${jti}`;
  }

  private familyRevokeKey(tenantId: string, family: string): string {
    return `spancle:${tenantId}:revoked_family:${family}`;
  }

  private sessionSetKey(tenantId: string, identityId: string): string {
    return `spancle:${tenantId}:sessions:${identityId}`;
  }
}
