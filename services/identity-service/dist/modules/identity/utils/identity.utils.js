"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityUtils = void 0;
const crypto = __importStar(require("crypto"));
/**
 * IdentityUtils — stateless utility functions for the identity domain.
 * No dependencies — pure functions only.
 */
class IdentityUtils {
    /**
     * Generates a cryptographically secure random token (URL-safe base64).
     */
    static generateSecureToken(byteLength = 32) {
        return crypto.randomBytes(byteLength).toString('base64url');
    }
    /**
     * Returns a future Date object for token expiry calculations.
     */
    static expiryFromNow(seconds) {
        return new Date(Date.now() + seconds * 1000);
    }
    /**
     * Constant-time string comparison — prevents timing attacks.
     */
    static safeCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
    /**
     * Masks an email for safe logging: user@domain.com → us**@domain.com
     */
    static maskEmail(email) {
        const [local, domain] = email.split('@');
        if (!local || !domain)
            return '***';
        const visible = local.slice(0, 2);
        return `${visible}${'*'.repeat(Math.max(local.length - 2, 2))}@${domain}`;
    }
    /**
     * Builds tenant-namespaced Redis key.
     * Pattern: tenant:{tenantId}:identity:{suffix}
     */
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:identity:${suffix}`;
    }
    /**
     * Returns true if the account lockout window has expired.
     */
    static isLockExpired(lockedUntil) {
        if (!lockedUntil)
            return true;
        return lockedUntil.getTime() < Date.now();
    }
}
exports.IdentityUtils = IdentityUtils;
//# sourceMappingURL=identity.utils.js.map