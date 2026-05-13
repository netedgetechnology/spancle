import * as crypto from 'crypto';

/**
 * Cryptographic utilities — Node.js crypto only.
 * Do NOT import in browser bundles.
 */

/** Generates a cryptographically secure random token (URL-safe base64). */
export function generateSecureToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString('base64url');
}

/** Generates a random UUID v4. */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/** Constant-time string comparison — prevents timing attacks. */
export function safeCompare(a: string, b: string): boolean {
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
export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/** HMAC-SHA256 of a string using a secret key, returned as hex. */
export function hmacSha256(input: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(input, 'utf8').digest('hex');
}

/** AES-256-GCM encryption. Returns base64url-encoded ciphertext. */
export function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, 'hex');
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

/** AES-256-GCM decryption. Accepts base64url-encoded ciphertext. */
export function decrypt(ciphertext: string, keyHex: string): string {
  const key  = Buffer.from(keyHex, 'hex');
  const data = Buffer.from(ciphertext, 'base64url');
  const iv        = data.subarray(0, 12);
  const tag       = data.subarray(12, 28);
  const encrypted = data.subarray(28);
  const decipher  = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
