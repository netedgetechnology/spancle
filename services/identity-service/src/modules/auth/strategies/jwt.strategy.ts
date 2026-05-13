import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayloadSchema } from '@spancle/types';
import type { JwtPayload } from '@spancle/types';
import { TokenUtils } from '@spancle/auth-sdk';
import { AuthRepository } from '../repositories/auth.repository';

/**
 * JwtStrategy — validates access tokens extracted from Authorization: Bearer header.
 *
 * Validation pipeline:
 *   1. Passport extracts token from Authorization header
 *   2. passport-jwt verifies signature using JWT_SECRET
 *   3. JwtStrategy.validate() runs structural + business validation:
 *      a. Zod schema validation of payload shape
 *      b. Checks token JTI is not blacklisted in Redis
 *      c. Ensures tenant context on payload matches request tenant
 *
 * Returns the validated JwtPayload → set as request.user by Passport.
 *
 * Secret rotation: if JWT_SECRET verification fails, passport-jwt will
 * not call validate() — the error is caught by JwtAuthGuard.handleRequest().
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    config: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest:   ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:      config.getOrThrow<string>('JWT_SECRET'),
      issuer:           config.get<string>('JWT_ISSUER', 'spancle-sports-os'),
    });
  }

  /**
   * Called by Passport after signature verification passes.
   * The return value becomes request.user.
   * Throw UnauthorizedException to reject the request.
   */
  async validate(rawPayload: unknown): Promise<JwtPayload> {
    // 1. Structural validation
    const result = JwtPayloadSchema.safeParse(rawPayload);

    if (!result.success) {
      this.logger.warn(`JWT payload failed schema validation: ${result.error.message}`);
      throw new UnauthorizedException('Malformed token payload');
    }

    const payload = result.data;

    // 2. Validate token is not blacklisted (logout / security revocation)
    const isBlacklisted = await this.authRepository.isTokenBlacklisted(
      payload.tenantId,
      payload.jti ?? payload.sub,
    );

    if (isBlacklisted) {
      this.logger.warn(
        `Blacklisted token used — sub: ${payload.sub} tenantId: ${payload.tenantId}`,
      );
      throw new UnauthorizedException('Token has been revoked');
    }

    // 3. Check for near-expiry (informational log only — not a rejection)
    if (TokenUtils.isExpiringSoon(payload.exp, 60)) {
      this.logger.debug(
        `Token expiring soon — sub: ${payload.sub} seconds: ${TokenUtils.secondsUntilExpiry(payload.exp)}`,
      );
    }

    return payload;
  }
}
