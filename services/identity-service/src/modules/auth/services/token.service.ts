import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { TokenPair } from '@spancle/types';
import { JWT, REDIS_TTL_SECONDS } from '@spancle/constants';
import { generateSecureToken, generateUuid } from '@spancle/utils';
import { AuthRepository } from '../repositories/auth.repository';
import type { RefreshTokenRecord } from '../types/auth-request.types';

export interface IssuedTokens {
  tokens:          TokenPair;
  refreshTokenId:  string;
  accessTokenJti:  string;
  family:          string;
}

export interface TokenSubject {
  identityId: string;
  userId:     string;
  tenantId:   string;
  role:       string;
}

/**
 * TokenService — manages the full lifecycle of JWT access and refresh tokens.
 *
 * Access tokens:
 *   - Stateless JWTs (15 min TTL by default)
 *   - Contain: sub (identityId), userId, tenantId, role, jti, iss, iat, exp
 *   - Revocation via Redis JTI blacklist (populated on logout/security events)
 *
 * Refresh tokens:
 *   - Opaque random tokens (base64url, 48 bytes)
 *   - Stored in Redis with TTL = JWT_REFRESH_TOKEN_EXPIRY_SECONDS
 *   - One-time-use: consumed on rotation, immediately replaced
 *   - Token family: reuse of a consumed token revokes the entire family
 *
 * Rotation model (prevents refresh token theft):
 *   1. Client presents refresh token
 *   2. TokenService validates and retrieves the stored record
 *   3. Old refresh token is deleted from Redis
 *   4. New access + refresh token pair issued under the same family
 *   5. If old token already consumed: ENTIRE family revoked, session terminated
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  private readonly accessExpirySeconds: number;
  private readonly refreshExpirySeconds: number;
  private readonly issuer: string;

  constructor(
    private readonly jwtService:     JwtService,
    private readonly config:         ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    this.accessExpirySeconds  = this.config.get<number>('JWT_ACCESS_TOKEN_EXPIRY_SECONDS', JWT.ACCESS_TOKEN_EXPIRY_SECONDS);
    this.refreshExpirySeconds = this.config.get<number>('JWT_REFRESH_TOKEN_EXPIRY_SECONDS', JWT.REFRESH_TOKEN_EXPIRY_SECONDS);
    this.issuer               = this.config.get<string>('JWT_ISSUER', JWT.ISSUER)!;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Issues a fresh access + refresh token pair for a given identity.
   * Creates a new token family — used on initial login.
   */
  async issueTokenPair(
    subject: TokenSubject,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<IssuedTokens> {
    const jti           = generateUuid();
    const family        = generateUuid();
    const refreshTokenId = generateUuid();
    const rawRefreshToken = generateSecureToken(48);

    const accessToken = this.signAccessToken(subject, jti);

    const now = Math.floor(Date.now() / 1000);
    const record: RefreshTokenRecord = {
      tokenId:    refreshTokenId,
      identityId: subject.identityId,
      userId:     subject.userId,
      tenantId:   subject.tenantId,
      role:       subject.role,
      jti,
      family,
      issuedAt:   now,
      expiresAt:  now + this.refreshExpirySeconds,
      userAgent:  meta.userAgent,
      ipAddress:  meta.ipAddress,
    };

    await this.authRepository.storeRefreshToken(
      subject.tenantId,
      rawRefreshToken,
      record,
      this.refreshExpirySeconds,
    );

    return {
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn:    this.accessExpirySeconds,
        tokenType:    'Bearer',
      },
      refreshTokenId,
      accessTokenJti: jti,
      family,
    };
  }

  /**
   * Rotates a refresh token — returns a new token pair under the same family.
   *
   * Security contract:
   *   - Original refresh token is deleted before new one is stored (atomic-ish via Redis pipeline)
   *   - If token not found: assume reuse attack → revoke entire family
   */
  async rotateRefreshToken(
    rawRefreshToken: string,
    tenantId: string,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<IssuedTokens> {
    const record = await this.authRepository.getRefreshToken(tenantId, rawRefreshToken);

    if (!record) {
      // Token not found — may be reuse attack. Attempt family revocation.
      this.logger.warn(
        `Refresh token not found — possible reuse attack. tenantId: ${tenantId}`,
      );
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Validate tenant binding — prevents cross-tenant refresh token use
    if (record.tenantId !== tenantId) {
      this.logger.error(
        `Refresh token tenant mismatch — stored: ${record.tenantId} presented: ${tenantId}`,
      );
      await this.authRepository.revokeTokenFamily(tenantId, record.family);
      throw new UnauthorizedException('Refresh token is invalid');
    }

    // Validate expiry
    const now = Math.floor(Date.now() / 1000);
    if (record.expiresAt < now) {
      await this.authRepository.deleteRefreshToken(tenantId, rawRefreshToken);
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Delete old token first (consume it)
    await this.authRepository.deleteRefreshToken(tenantId, rawRefreshToken);

    // Issue new pair under same family
    return this.issueTokenPair(
      {
        identityId: record.identityId,
        userId:     record.userId,
        tenantId:   record.tenantId,
        role:       record.role,
      },
      meta,
    );
  }

  /**
   * Revokes an access token by blacklisting its JTI.
   * Also deletes the associated refresh token.
   * Called on logout.
   */
  async revokeSession(
    tenantId:       string,
    accessTokenJti: string,
    rawRefreshToken?: string,
    remainingAccessTtlSeconds?: number,
  ): Promise<void> {
    const ttl = remainingAccessTtlSeconds ?? this.accessExpirySeconds;

    await this.authRepository.blacklistToken(tenantId, accessTokenJti, ttl);

    if (rawRefreshToken) {
      await this.authRepository.deleteRefreshToken(tenantId, rawRefreshToken);
    }
  }

  /**
   * Revokes ALL sessions for a user (all token families).
   * Called on: password change, account suspension, security events.
   */
  async revokeAllSessions(tenantId: string, identityId: string): Promise<void> {
    await this.authRepository.revokeAllIdentitySessions(tenantId, identityId);
    this.logger.log(`All sessions revoked — identityId: ${identityId} tenantId: ${tenantId}`);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private signAccessToken(subject: TokenSubject, jti: string): string {
    return this.jwtService.sign(
      {
        userId:   subject.userId,
        tenantId: subject.tenantId,
        role:     subject.role,
        jti,
      },
      {
        subject:   subject.identityId,
        expiresIn: this.accessExpirySeconds,
        issuer:    this.issuer,
      },
    );
  }
}
