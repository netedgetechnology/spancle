import type { TokenValidationResult } from './token.types';
/**
 * TokenUtils — stateless token helpers.
 *
 * Note: Actual JWT signing/verification is performed by NestJS JwtService
 * (backend) or next-auth (frontend). These helpers operate on already-decoded
 * payloads and perform structural / claim validation only.
 */
export declare class TokenUtils {
    /**
     * Decodes the payload portion of a JWT without verifying signature.
     * NEVER use this for authorization decisions — only for reading claims
     * on already-verified tokens.
     */
    static decodePayload(token: string): Record<string, unknown> | null;
    /**
     * Validates the structural claims of an already-verified JWT payload.
     * Does NOT verify the signature — that is the JWT library's responsibility.
     */
    static validatePayload(raw: unknown): TokenValidationResult;
    /**
     * Returns seconds until token expires. Negative if already expired.
     */
    static secondsUntilExpiry(exp: number): number;
    /**
     * Returns true if the token will expire within the given threshold.
     */
    static isExpiringSoon(exp: number, thresholdSeconds?: number): boolean;
    /**
     * Extracts tenant ID from token payload.
     */
    static extractTenantId(payload: Record<string, unknown>): string | null;
    /**
     * Extracts role from token payload.
     */
    static extractRole(payload: Record<string, unknown>): string | null;
}
//# sourceMappingURL=token.utils.d.ts.map