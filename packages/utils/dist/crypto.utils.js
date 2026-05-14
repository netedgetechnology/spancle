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
exports.generateSecureToken = generateSecureToken;
exports.generateUuid = generateUuid;
exports.safeCompare = safeCompare;
exports.sha256 = sha256;
exports.hmacSha256 = hmacSha256;
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto = __importStar(require("crypto"));
/**
 * Cryptographic utilities — Node.js crypto only.
 * Do NOT import in browser bundles.
 */
/** Generates a cryptographically secure random token (URL-safe base64). */
function generateSecureToken(byteLength = 32) {
    return crypto.randomBytes(byteLength).toString('base64url');
}
/** Generates a random UUID v4. */
function generateUuid() {
    return crypto.randomUUID();
}
/** Constant-time string comparison — prevents timing attacks. */
function safeCompare(a, b) {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
        // Still do the comparison to avoid timing leak on length
        crypto.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}
/** SHA-256 hash of a string, returned as hex. */
function sha256(input) {
    return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}
/** HMAC-SHA256 of a string using a secret key, returned as hex. */
function hmacSha256(input, secret) {
    return crypto.createHmac('sha256', secret).update(input, 'utf8').digest('hex');
}
/** AES-256-GCM encryption. Returns base64url-encoded ciphertext. */
function encrypt(plaintext, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}
/** AES-256-GCM decryption. Accepts base64url-encoded ciphertext. */
function decrypt(ciphertext, keyHex) {
    const key = Buffer.from(keyHex, 'hex');
    const data = Buffer.from(ciphertext, 'base64url');
    const iv = data.subarray(0, 12);
    const tag = data.subarray(12, 28);
    const encrypted = data.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
//# sourceMappingURL=crypto.utils.js.map