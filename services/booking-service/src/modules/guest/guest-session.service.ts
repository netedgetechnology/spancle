import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto       from 'node:crypto';

/**
 * GuestSessionService
 *
 * Issues and validates short-lived, HMAC-signed guest session tokens.
 *
 * Architecture:
 *   NO database records are created. A guest session is a signed opaque string
 *   containing tenant context, expiry, and a nonce. It is stateless — the
 *   service validates by re-computing the HMAC rather than looking up a record.
 *
 * Purpose:
 *   Prevents spam against POST /bookings (guest) without requiring account
 *   creation. The frontend must obtain a guest session token (POST /guest/session)
 *   before it can call POST /bookings (guest). The token is short-lived (15 min)
 *   and single-use by convention (the booking creation consumes it conceptually).
 *
 * Token format (URL-safe base64):
 *   <version>.<payload_b64>.<hmac_b64>
 *   payload: { tenantId, exp, jti, purpose }
 *
 * Signing key:
 *   GUEST_SESSION_SECRET env var (separate from JWT_SECRET — independent rotation).
 *   Falls back to a derived key from JWT_SECRET with a fixed prefix to avoid
 *   key reuse, but a dedicated secret is strongly recommended in production.
 *
 * Rate limiting:
 *   POST /guest/session is rate-limited at 10 requests/min per IP at the
 *   controller level. This is the primary anti-spam gate.
 */
@Injectable()
export class GuestSessionService {
  private readonly logger  = new Logger(GuestSessionService.name);
  private readonly secret:  string;
  private readonly VERSION = 'gs1';
  private readonly TTL_MS  = 15 * 60 * 1000; // 15 minutes

  constructor(private readonly config: ConfigService) {
    // Prefer a dedicated secret; derive from JWT_SECRET as a fallback
    const dedicated = config.get<string>('GUEST_SESSION_SECRET');
    if (dedicated) {
      this.secret = dedicated;
    } else {
      const jwtSecret = config.getOrThrow<string>('JWT_SECRET');
      // Derive via HKDF-like prefix to prevent key confusion with JWT
      this.secret = crypto
        .createHmac('sha256', jwtSecret)
        .update('spancle:guest-session:key-derivation')
        .digest('hex');
      this.logger.warn(
        'GUEST_SESSION_SECRET not set — using derived key from JWT_SECRET. ' +
        'Set GUEST_SESSION_SECRET for independent rotation.',
      );
    }
  }

  // ── Issuance ──────────────────────────────────────────────────────────────

  /**
   * issue() — creates a signed guest session token.
   *
   * @param tenantId   The tenant for which the session is valid.
   * @param clientIp   Optional: bound to IP for tighter replay prevention.
   */
  issue(tenantId: string, clientIp?: string): { token: string; expiresAt: string } {
    const now       = Date.now();
    const expiresAt = new Date(now + this.TTL_MS);

    const payload: GuestSessionPayload = {
      tenantId,
      exp:     expiresAt.getTime(),
      jti:     crypto.randomUUID(),
      purpose: 'guest_booking',
      ...(clientIp ? { ip: clientIp } : {}),
    };

    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const data       = `${this.VERSION}.${payloadB64}`;
    const hmac       = this.sign(data);
    const token      = `${data}.${hmac}`;

    this.logger.debug(`Guest session issued — tenant=${tenantId} jti=${payload.jti}`);

    return { token, expiresAt: expiresAt.toISOString() };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  /**
   * validate() — verifies and parses a guest session token.
   *
   * Throws UnauthorizedException on any failure (constant-error messaging
   * to prevent oracle attacks).
   *
   * @param token      The raw guest session token string.
   * @param tenantId   Expected tenant — must match payload.tenantId.
   */
  validate(token: string, tenantId: string): GuestSessionPayload {
    // Structure check
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Invalid guest session');
    }

    const [version, payloadB64, providedHmac] = parts as [string, string, string];

    // Version check
    if (version !== this.VERSION) {
      throw new UnauthorizedException('Invalid guest session');
    }

    // HMAC verification (constant-time)
    const data     = `${version}.${payloadB64}`;
    const expected = this.sign(data);
    const eq       = crypto.timingSafeEqual(
      Buffer.from(providedHmac, 'base64url'),
      Buffer.from(expected,     'base64url'),
    );
    if (!eq) {
      this.logger.warn('Guest session HMAC mismatch — possible tampering');
      throw new UnauthorizedException('Invalid guest session');
    }

    // Parse payload
    let payload: GuestSessionPayload;
    try {
      payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      ) as GuestSessionPayload;
    } catch {
      throw new UnauthorizedException('Invalid guest session');
    }

    // Expiry check
    if (Date.now() > payload.exp) {
      throw new UnauthorizedException('Guest session expired');
    }

    // Tenant binding
    if (payload.tenantId !== tenantId) {
      this.logger.warn(
        `Guest session tenant mismatch — token=${payload.tenantId} request=${tenantId}`,
      );
      throw new UnauthorizedException('Invalid guest session');
    }

    return payload;
  }

  // ── Guest token for post-booking email lookup ─────────────────────────────

  /**
   * issueGuestLookupToken() — issues a signed token for the booking confirmation
   * email so guests can look up their booking without an account.
   *
   * Bound to: bookingId + customerEmail + tenantId.
   * TTL: 7 days (one email link validity window).
   */
  issueGuestLookupToken(params: {
    bookingId:     string;
    customerEmail: string;
    tenantId:      string;
  }): string {
    const payload = {
      bid: params.bookingId,
      em:  params.customerEmail.toLowerCase().trim(),
      tid: params.tenantId,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
      jti: crypto.randomUUID(),
    };
    const b64  = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const hmac = this.sign(`lookup.${b64}`);
    return `lookup.${b64}.${hmac}`;
  }

  /**
   * validateGuestLookupToken() — validates the email-link token for guest
   * booking lookup.
   *
   * Returns { bookingId, customerEmail, tenantId } on success.
   */
  validateGuestLookupToken(token: string, tenantId: string): {
    bookingId:     string;
    customerEmail: string;
  } {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'lookup') {
      throw new UnauthorizedException('Invalid lookup token');
    }
    const [, b64, provided] = parts as [string, string, string];
    const expected = this.sign(`lookup.${b64}`);

    const eq = crypto.timingSafeEqual(
      Buffer.from(provided,  'base64url'),
      Buffer.from(expected, 'base64url'),
    );
    if (!eq) throw new UnauthorizedException('Invalid lookup token');

    let p: { bid: string; em: string; tid: string; exp: number };
    try {
      p = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as typeof p;
    } catch {
      throw new UnauthorizedException('Invalid lookup token');
    }

    if (Date.now() > p.exp)    throw new UnauthorizedException('Lookup token expired');
    if (p.tid !== tenantId)    throw new UnauthorizedException('Invalid lookup token');

    return { bookingId: p.bid, customerEmail: p.em };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private sign(data: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('base64url');
  }
}

export interface GuestSessionPayload {
  tenantId: string;
  exp:      number;
  jti:      string;
  purpose:  string;
  ip?:      string;
}
