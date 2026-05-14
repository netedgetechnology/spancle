"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenUtils = void 0;
const types_1 = require("@spancle/types");
const constants_1 = require("@spancle/constants");
/**
 * TokenUtils — stateless token helpers.
 *
 * Note: Actual JWT signing/verification is performed by NestJS JwtService
 * (backend) or next-auth (frontend). These helpers operate on already-decoded
 * payloads and perform structural / claim validation only.
 */
class TokenUtils {
    /**
     * Decodes the payload portion of a JWT without verifying signature.
     * NEVER use this for authorization decisions — only for reading claims
     * on already-verified tokens.
     */
    static decodePayload(token) {
        const parts = token.split('.');
        if (parts.length !== 3 || !parts[1])
            return null;
        try {
            const padded = parts[1] + '='.repeat((4 - (parts[1].length % 4)) % 4);
            return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
        }
        catch {
            return null;
        }
    }
    /**
     * Validates the structural claims of an already-verified JWT payload.
     * Does NOT verify the signature — that is the JWT library's responsibility.
     */
    static validatePayload(raw) {
        const result = types_1.JwtPayloadSchema.safeParse(raw);
        if (!result.success) {
            return { valid: false, payload: null, error: 'missing_claims' };
        }
        const payload = result.data;
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp < now) {
            return { valid: false, payload, error: 'expired' };
        }
        if (payload.iss !== constants_1.JWT.ISSUER) {
            return { valid: false, payload: null, error: 'invalid' };
        }
        return { valid: true, payload, error: undefined };
    }
    /**
     * Returns seconds until token expires. Negative if already expired.
     */
    static secondsUntilExpiry(exp) {
        return exp - Math.floor(Date.now() / 1000);
    }
    /**
     * Returns true if the token will expire within the given threshold.
     */
    static isExpiringSoon(exp, thresholdSeconds = 60) {
        return TokenUtils.secondsUntilExpiry(exp) < thresholdSeconds;
    }
    /**
     * Extracts tenant ID from token payload.
     */
    static extractTenantId(payload) {
        return typeof payload['tenantId'] === 'string' ? payload['tenantId'] : null;
    }
    /**
     * Extracts role from token payload.
     */
    static extractRole(payload) {
        return typeof payload['role'] === 'string' ? payload['role'] : null;
    }
}
exports.TokenUtils = TokenUtils;
//# sourceMappingURL=token.utils.js.map