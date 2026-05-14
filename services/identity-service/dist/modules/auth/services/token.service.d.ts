import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { TokenPair } from '@spancle/types';
import { AuthRepository } from '../repositories/auth.repository';
export interface IssuedTokens {
    tokens: TokenPair;
    refreshTokenId: string;
    accessTokenJti: string;
    family: string;
}
export interface TokenSubject {
    identityId: string;
    userId: string;
    tenantId: string;
    role: string;
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
export declare class TokenService {
    private readonly jwtService;
    private readonly config;
    private readonly authRepository;
    private readonly logger;
    private readonly accessExpirySeconds;
    private readonly refreshExpirySeconds;
    private readonly issuer;
    constructor(jwtService: JwtService, config: ConfigService, authRepository: AuthRepository);
    /**
     * Issues a fresh access + refresh token pair for a given identity.
     * Creates a new token family — used on initial login.
     */
    issueTokenPair(subject: TokenSubject, meta?: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<IssuedTokens>;
    /**
     * Rotates a refresh token — returns a new token pair under the same family.
     *
     * Security contract:
     *   - Original refresh token is deleted before new one is stored (atomic-ish via Redis pipeline)
     *   - If token not found: assume reuse attack → revoke entire family
     */
    rotateRefreshToken(rawRefreshToken: string, tenantId: string, meta?: {
        userAgent?: string;
        ipAddress?: string;
    }): Promise<IssuedTokens>;
    /**
     * Revokes an access token by blacklisting its JTI.
     * Also deletes the associated refresh token.
     * Called on logout.
     */
    revokeSession(tenantId: string, accessTokenJti: string, rawRefreshToken?: string, remainingAccessTtlSeconds?: number): Promise<void>;
    /**
     * Revokes ALL sessions for a user (all token families).
     * Called on: password change, account suspension, security events.
     */
    revokeAllSessions(tenantId: string, identityId: string): Promise<void>;
    private signAccessToken;
}
//# sourceMappingURL=token.service.d.ts.map