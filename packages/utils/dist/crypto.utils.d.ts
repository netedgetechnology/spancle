/**
 * Cryptographic utilities — Node.js crypto only.
 * Do NOT import in browser bundles.
 */
/** Generates a cryptographically secure random token (URL-safe base64). */
export declare function generateSecureToken(byteLength?: number): string;
/** Generates a random UUID v4. */
export declare function generateUuid(): string;
/** Constant-time string comparison — prevents timing attacks. */
export declare function safeCompare(a: string, b: string): boolean;
/** SHA-256 hash of a string, returned as hex. */
export declare function sha256(input: string): string;
/** HMAC-SHA256 of a string using a secret key, returned as hex. */
export declare function hmacSha256(input: string, secret: string): string;
/** AES-256-GCM encryption. Returns base64url-encoded ciphertext. */
export declare function encrypt(plaintext: string, keyHex: string): string;
/** AES-256-GCM decryption. Accepts base64url-encoded ciphertext. */
export declare function decrypt(ciphertext: string, keyHex: string): string;
//# sourceMappingURL=crypto.utils.d.ts.map