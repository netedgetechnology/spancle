/**
 * IdentityUtils — stateless utility functions for the identity domain.
 * No dependencies — pure functions only.
 */
export declare class IdentityUtils {
    /**
     * Generates a cryptographically secure random token (URL-safe base64).
     */
    static generateSecureToken(byteLength?: number): string;
    /**
     * Returns a future Date object for token expiry calculations.
     */
    static expiryFromNow(seconds: number): Date;
    /**
     * Constant-time string comparison — prevents timing attacks.
     */
    static safeCompare(a: string, b: string): boolean;
    /**
     * Masks an email for safe logging: user@domain.com → us**@domain.com
     */
    static maskEmail(email: string): string;
    /**
     * Builds tenant-namespaced Redis key.
     * Pattern: tenant:{tenantId}:identity:{suffix}
     */
    static redisKey(tenantId: string, suffix: string): string;
    /**
     * Returns true if the account lockout window has expired.
     */
    static isLockExpired(lockedUntil: Date | null): boolean;
}
//# sourceMappingURL=identity.utils.d.ts.map