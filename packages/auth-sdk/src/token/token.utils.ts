import { JwtPayloadSchema } from '@spancle/types';
import { JWT } from '@spancle/constants';
import type { TokenValidationResult } from './token.types';

/**
 * TokenUtils — stateless token helpers.
 *
 * Note: Actual JWT signing/verification is performed by NestJS JwtService
 * (backend) or next-auth (frontend). These helpers operate on already-decoded
 * payloads and perform structural / claim validation only.
 */
export class TokenUtils {

  /**
   * Decodes the payload portion of a JWT without verifying signature.
   * NEVER use this for authorization decisions — only for reading claims
   * on already-verified tokens.
   */
  static decodePayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    try {
      const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
      return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Validates the structural claims of an already-verified JWT payload.
   * Does NOT verify the signature — that is the JWT library's responsibility.
   */
  static validatePayload(raw: unknown): TokenValidationResult {
    const result = JwtPayloadSchema.safeParse(raw);

    if (!result.success) {
      return { valid: false, payload: null, error: 'missing_claims' };
    }

    const payload = result.data;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp < now) {
      return { valid: false, payload, error: 'expired' };
    }

    if (payload.iss !== JWT.ISSUER) {
      return { valid: false, payload: null, error: 'invalid' };
    }

    return { valid: true, payload, error: undefined };
  }

  /**
   * Returns seconds until token expires. Negative if already expired.
   */
  static secondsUntilExpiry(exp: number): number {
    return exp - Math.floor(Date.now() / 1000);
  }

  /**
   * Returns true if the token will expire within the given threshold.
   */
  static isExpiringSoon(exp: number, thresholdSeconds = 60): boolean {
    return TokenUtils.secondsUntilExpiry(exp) < thresholdSeconds;
  }

  /**
   * Extracts tenant ID from token payload.
   */
  static extractTenantId(payload: Record<string, unknown>): string | null {
    return typeof payload['tenantId'] === 'string' ? payload['tenantId'] : null;
  }

  /**
   * Extracts role from token payload.
   */
  static extractRole(payload: Record<string, unknown>): string | null {
    return typeof payload['role'] === 'string' ? payload['role'] : null;
  }
}
