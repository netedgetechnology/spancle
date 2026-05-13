import * as crypto from 'crypto';

/**
 * IdentityUtils — stateless utility functions for the identity domain.
 * No dependencies — pure functions only.
 */
export class IdentityUtils {
  /**
   * Generates a cryptographically secure random token (URL-safe base64).
   */
  static generateSecureToken(byteLength = 32): string {
    return crypto.randomBytes(byteLength).toString('base64url');
  }

  /**
   * Returns a future Date object for token expiry calculations.
   */
  static expiryFromNow(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
  }

  /**
   * Constant-time string comparison — prevents timing attacks.
   */
  static safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  /**
   * Masks an email for safe logging: user@domain.com → us**@domain.com
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, 2);
    return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
  }

  /**
   * Builds tenant-namespaced Redis key.
   * Pattern: tenant:{tenantId}:identity:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:identity:${suffix}`;
  }

  /**
   * Returns true if the account lockout window has expired.
   */
  static isLockExpired(lockedUntil: Date | null): boolean {
    if (!lockedUntil) return true;
    return lockedUntil.getTime() < Date.now();
  }
}
