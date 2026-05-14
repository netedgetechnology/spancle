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
    tenantId: string;
    bookingId: string;
    courtId: string;
    branchId: string;
    purpose: string;
    issuedAt: number;
    expiresAt: number;
    maxUses: number;
    nonce: string;
}
export interface ParsedRawToken {
    data: string;
    signature: string;
}
export declare class QrUtils {
    /**
     * Generates a new raw QR token string.
     * Returns: { rawToken, tokenHash }
     *   rawToken  — returned to caller once; embedded in QR code
     *   tokenHash — SHA-256 hex; persisted to DB
     */
    static generateToken(tenantId: string, bookingId: string, secret: string): {
        rawToken: string;
        tokenHash: string;
    };
    /**
     * Produces the SHA-256 hex hash of a raw token.
     * Used for all DB lookups — the raw token is never stored.
     */
    static hashToken(rawToken: string): string;
    /**
     * Verifies the HMAC signature of a raw token.
     * Uses timing-safe comparison to prevent timing attacks.
     * Returns true if the token is structurally valid (signature matches).
     * Does NOT check expiry or usage — that is the repository's concern.
     */
    static verifyTokenSignature(rawToken: string, secret: string): boolean;
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
    static buildSignedPayload(payload: QrTokenPayload, secret: string): string;
    /**
     * Decodes and verifies a signed payload created by buildSignedPayload.
     * Returns the decoded QrTokenPayload or null if verification fails.
     */
    static verifySignedPayload(signedPayload: string, secret: string): QrTokenPayload | null;
    /**
     * Builds the QR code content string.
     * This is the value embedded in the visual QR code.
     * Format: spancle://verify?t={rawToken}&p={purpose}
     *
     * The scheme allows mobile apps to deep-link to the verify endpoint.
     * Smart devices use their own SDK to call the scan API directly.
     */
    static buildQrContent(rawToken: string, purpose: string): string;
    /**
     * Extracts the raw token from a QR content string.
     * Returns null if the format is unrecognised.
     */
    static extractTokenFromQrContent(qrContent: string): string | null;
    /**
     * Returns a Redis key for caching an issued token's metadata.
     * Used to avoid DB hits on high-frequency device scans.
     */
    static redisKey(tenantId: string, tokenHash: string): string;
    /**
     * Calculates the token expiry date from a TTL in minutes.
     */
    static expiresAt(ttlMinutes: number): Date;
    /**
     * Returns whether a token is within the allowed check-in window for a booking.
     *
     * Check-in window: 30 minutes before startAt to 60 minutes after startAt.
     * This is validated at the service layer using booking data, not device data.
     */
    static isWithinCheckInWindow(bookingStartAt: Date, now?: Date, earlyMinutes?: number, lateMinutes?: number): boolean;
}
//# sourceMappingURL=qr.utils.d.ts.map