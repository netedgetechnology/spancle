import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * QrUtils — stateless cryptographic helpers for QR token lifecycle.
 *
 * Token format (raw, returned to client once):
 *   base64url( tenantId:bookingId:nonce ) + '.' + HMAC-SHA256-signature
 *
 * The raw token is never persisted. Only its SHA-256 hash is stored.
 * Smart access devices receive the signedPayload (JWT-like compact JWS)
 * and verify it offline using the tenant's shared secret.
 */

export interface QrTokenPayload {
  tenantId:  string;
  bookingId: string;
  courtId:   string;
  branchId:  string;
  purpose:   string;
  issuedAt:  number;   // Unix timestamp ms
  expiresAt: number;   // Unix timestamp ms
  maxUses:   number;
  nonce:     string;
}

export interface ParsedRawToken {
  data:      string;   // base64url-decoded data part
  signature: string;   // hex signature part
}

const ALG = 'sha256';

export class QrUtils {

  /**
   * Generates a new raw QR token string.
   * Returns: { rawToken, tokenHash }
   *   rawToken  — returned to caller once; embedded in QR code
   *   tokenHash — SHA-256 hex; persisted to DB
   */
  static generateToken(
    tenantId:  string,
    bookingId: string,
    secret:    string,
  ): { rawToken: string; tokenHash: string } {
    const nonce    = randomBytes(16).toString('hex');
    const data     = Buffer.from(`${tenantId}:${bookingId}:${nonce}`).toString('base64url');
    const sig      = createHmac(ALG, secret).update(data).digest('hex');
    const rawToken = `${data}.${sig}`;
    const tokenHash = QrUtils.hashToken(rawToken);
    return { rawToken, tokenHash };
  }

  /**
   * Produces the SHA-256 hex hash of a raw token.
   * Used for all DB lookups — the raw token is never stored.
   */
  static hashToken(rawToken: string): string {
    return createHash(ALG).update(rawToken).digest('hex');
  }

  /**
   * Verifies the HMAC signature of a raw token.
   * Uses timing-safe comparison to prevent timing attacks.
   * Returns true if the token is structurally valid (signature matches).
   * Does NOT check expiry or usage — that is the repository's concern.
   */
  static verifyTokenSignature(rawToken: string, secret: string): boolean {
    const dotIdx = rawToken.lastIndexOf('.');
    if (dotIdx === -1) return false;

    const data         = rawToken.slice(0, dotIdx);
    const providedSig  = rawToken.slice(dotIdx + 1);
    const expectedSig  = createHmac(ALG, secret).update(data).digest('hex');

    if (providedSig.length !== expectedSig.length) return false;

    try {
      return timingSafeEqual(
        Buffer.from(providedSig, 'hex'),
        Buffer.from(expectedSig, 'hex'),
      );
    } catch {
      return false;
    }
  }

  /**
   * Builds a compact signed payload for offline device verification.
   *
   * Format: base64url(header).base64url(payload).HMAC-signature
   * Intentionally JWT-compatible but without the full JWT library dependency.
   *
   * Smart access devices decode the payload to verify booking details
   * without a network round-trip. The signature is verified using the
   * device's pre-loaded shared secret.
   */
  static buildSignedPayload(payload: QrTokenPayload, secret: string): string {
    const header    = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'QR' })).toString('base64url');
    const body      = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sigInput  = `${header}.${body}`;
    const signature = createHmac(ALG, secret).update(sigInput).digest('base64url');
    return `${sigInput}.${signature}`;
  }

  /**
   * Decodes and verifies a signed payload created by buildSignedPayload.
   * Returns the decoded QrTokenPayload or null if verification fails.
   */
  static verifySignedPayload(
    signedPayload: string,
    secret:        string,
  ): QrTokenPayload | null {
    const parts = signedPayload.split('.');
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts as [string, string, string];
    const sigInput    = `${header}.${body}`;
    const expectedSig = createHmac(ALG, secret).update(sigInput).digest('base64url');

    try {
      const valid = timingSafeEqual(
        Buffer.from(signature,   'base64url'),
        Buffer.from(expectedSig, 'base64url'),
      );
      if (!valid) return null;
    } catch {
      return null;
    }

    try {
      const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as QrTokenPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Builds the QR code content string.
   * This is the value embedded in the visual QR code.
   * Format: spancle://verify?t={rawToken}&p={purpose}
   *
   * The scheme allows mobile apps to deep-link to the verify endpoint.
   * Smart devices use their own SDK to call the scan API directly.
   */
  static buildQrContent(rawToken: string, purpose: string): string {
    const params = new URLSearchParams({ t: rawToken, p: purpose });
    return `spancle://verify?${params.toString()}`;
  }

  /**
   * Extracts the raw token from a QR content string.
   * Returns null if the format is unrecognised.
   */
  static extractTokenFromQrContent(qrContent: string): string | null {
    try {
      // Handle both deep-link format and raw token format
      if (qrContent.startsWith('spancle://verify?')) {
        const url    = new URL(qrContent.replace('spancle://', 'https://spancle.app/'));
        const token  = url.searchParams.get('t');
        return token ?? null;
      }
      // Raw token passed directly (device API)
      if (qrContent.includes('.') && qrContent.length > 40) {
        return qrContent;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Returns a Redis key for caching an issued token's metadata.
   * Used to avoid DB hits on high-frequency device scans.
   */
  static redisKey(tenantId: string, tokenHash: string): string {
    return `tenant:${tenantId}:qr:${tokenHash}`;
  }

  /**
   * Calculates the token expiry date from a TTL in minutes.
   */
  static expiresAt(ttlMinutes: number): Date {
    return new Date(Date.now() + ttlMinutes * 60_000);
  }

  /**
   * Returns whether a token is within the allowed check-in window for a booking.
   *
   * Check-in window: 30 minutes before startAt to 60 minutes after startAt.
   * This is validated at the service layer using booking data, not device data.
   */
  static isWithinCheckInWindow(
    bookingStartAt: Date,
    now            = new Date(),
    earlyMinutes   = 30,
    lateMinutes    = 60,
  ): boolean {
    const earliest = bookingStartAt.getTime() - earlyMinutes * 60_000;
    const latest   = bookingStartAt.getTime() + lateMinutes  * 60_000;
    const ts       = now.getTime();
    return ts >= earliest && ts <= latest;
  }
}
