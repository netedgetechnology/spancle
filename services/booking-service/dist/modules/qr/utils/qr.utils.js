"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QrUtils = void 0;
const node_crypto_1 = require("node:crypto");
const ALG = 'sha256';
class QrUtils {
    /**
     * Generates a new raw QR token string.
     * Returns: { rawToken, tokenHash }
     *   rawToken  — returned to caller once; embedded in QR code
     *   tokenHash — SHA-256 hex; persisted to DB
     */
    static generateToken(tenantId, bookingId, secret) {
        const nonce = (0, node_crypto_1.randomBytes)(16).toString('hex');
        const data = Buffer.from(`${tenantId}:${bookingId}:${nonce}`).toString('base64url');
        const sig = (0, node_crypto_1.createHmac)(ALG, secret).update(data).digest('hex');
        const rawToken = `${data}.${sig}`;
        const tokenHash = QrUtils.hashToken(rawToken);
        return { rawToken, tokenHash };
    }
    /**
     * Produces the SHA-256 hex hash of a raw token.
     * Used for all DB lookups — the raw token is never stored.
     */
    static hashToken(rawToken) {
        return (0, node_crypto_1.createHash)(ALG).update(rawToken).digest('hex');
    }
    /**
     * Verifies the HMAC signature of a raw token.
     * Uses timing-safe comparison to prevent timing attacks.
     * Returns true if the token is structurally valid (signature matches).
     * Does NOT check expiry or usage — that is the repository's concern.
     */
    static verifyTokenSignature(rawToken, secret) {
        const dotIdx = rawToken.lastIndexOf('.');
        if (dotIdx === -1)
            return false;
        const data = rawToken.slice(0, dotIdx);
        const providedSig = rawToken.slice(dotIdx + 1);
        const expectedSig = (0, node_crypto_1.createHmac)(ALG, secret).update(data).digest('hex');
        if (providedSig.length !== expectedSig.length)
            return false;
        try {
            return (0, node_crypto_1.timingSafeEqual)(Buffer.from(providedSig, 'hex'), Buffer.from(expectedSig, 'hex'));
        }
        catch {
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
    static buildSignedPayload(payload, secret) {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'QR' })).toString('base64url');
        const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const sigInput = `${header}.${body}`;
        const signature = (0, node_crypto_1.createHmac)(ALG, secret).update(sigInput).digest('base64url');
        return `${sigInput}.${signature}`;
    }
    /**
     * Decodes and verifies a signed payload created by buildSignedPayload.
     * Returns the decoded QrTokenPayload or null if verification fails.
     */
    static verifySignedPayload(signedPayload, secret) {
        const parts = signedPayload.split('.');
        if (parts.length !== 3)
            return null;
        const [header, body, signature] = parts;
        const sigInput = `${header}.${body}`;
        const expectedSig = (0, node_crypto_1.createHmac)(ALG, secret).update(sigInput).digest('base64url');
        try {
            const valid = (0, node_crypto_1.timingSafeEqual)(Buffer.from(signature, 'base64url'), Buffer.from(expectedSig, 'base64url'));
            if (!valid)
                return null;
        }
        catch {
            return null;
        }
        try {
            const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
            return decoded;
        }
        catch {
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
    static buildQrContent(rawToken, purpose) {
        const params = new URLSearchParams({ t: rawToken, p: purpose });
        return `spancle://verify?${params.toString()}`;
    }
    /**
     * Extracts the raw token from a QR content string.
     * Returns null if the format is unrecognised.
     */
    static extractTokenFromQrContent(qrContent) {
        try {
            // Handle both deep-link format and raw token format
            if (qrContent.startsWith('spancle://verify?')) {
                const url = new URL(qrContent.replace('spancle://', 'https://spancle.app/'));
                const token = url.searchParams.get('t');
                return token ?? null;
            }
            // Raw token passed directly (device API)
            if (qrContent.includes('.') && qrContent.length > 40) {
                return qrContent;
            }
            return null;
        }
        catch {
            return null;
        }
    }
    /**
     * Returns a Redis key for caching an issued token's metadata.
     * Used to avoid DB hits on high-frequency device scans.
     */
    static redisKey(tenantId, tokenHash) {
        return `tenant:${tenantId}:qr:${tokenHash}`;
    }
    /**
     * Calculates the token expiry date from a TTL in minutes.
     */
    static expiresAt(ttlMinutes) {
        return new Date(Date.now() + ttlMinutes * 60_000);
    }
    /**
     * Returns whether a token is within the allowed check-in window for a booking.
     *
     * Check-in window: 30 minutes before startAt to 60 minutes after startAt.
     * This is validated at the service layer using booking data, not device data.
     */
    static isWithinCheckInWindow(bookingStartAt, now = new Date(), earlyMinutes = 30, lateMinutes = 60) {
        const earliest = bookingStartAt.getTime() - earlyMinutes * 60_000;
        const latest = bookingStartAt.getTime() + lateMinutes * 60_000;
        const ts = now.getTime();
        return ts >= earliest && ts <= latest;
    }
}
exports.QrUtils = QrUtils;
//# sourceMappingURL=qr.utils.js.map