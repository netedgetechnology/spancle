/**
 * QrTokenPurpose — what this token is used for.
 * Extensible: future purposes include access_gate, locker, equipment_room.
 */
export type QrTokenPurpose = 'booking_checkin' | 'access_gate' | 'locker_unlock' | 'equipment_room' | 'visitor_pass';
export type QrTokenStatus = 'active' | 'used' | 'expired' | 'revoked';
/**
 * QrTokenEntity — an issued, single-use (or limited-use) QR token.
 *
 * Design:
 *   - tokenHash: SHA-256 of the raw token string — never stored in plain text.
 *     The raw token is returned once at generation time and never persisted.
 *
 *   - payload: JSONB blob encrypted/signed at the application layer.
 *     Contains: bookingId, tenantId, courtId, purpose, issuedAt, expiresAt.
 *     Smart access devices decode this to authorise entry without a DB call.
 *
 *   - maxUses: supports single-use (1) and multi-use (e.g. recurring group sessions).
 *     Default 1 for booking check-in.
 *
 *   - deviceId: ID of the smart access device that last scanned this token.
 *     Null until first scan. Future: cross-reference against door_controllers table.
 *
 * Table: qr_tokens
 * Audit: INSERT only for used_at / scan history; no UPDATE on the main record after issue.
 */
export declare class QrTokenEntity {
    id: string;
    tenantId: string;
    branchId: string;
    courtId: string;
    /** FK → bookings.id — the booking this token grants access for */
    bookingId: string;
    /** FK → users.id (identity-service). Null = guest / walk-in */
    userId: string | null;
    /**
     * SHA-256 hex digest of the raw token.
     * Raw token = base64url(tenantId:bookingId:nonce:issuedAt) + HMAC signature.
     * Unique index — used for O(1) lookup on scan.
     */
    tokenHash: string;
    /**
     * HMAC-SHA256 signed payload for offline verification by smart devices.
     * JSON: { tenantId, bookingId, courtId, branchId, purpose, issuedAt, expiresAt }
     * Signed with QR_TOKEN_SECRET env var. Devices hold the public verification key.
     */
    signedPayload: string;
    purpose: QrTokenPurpose;
    status: QrTokenStatus;
    maxUses: number;
    useCount: number;
    expiresAt: Date;
    firstUsedAt: Date | null;
    lastUsedAt: Date | null;
    /**
     * ID of the physical access device (door controller, gate, locker unit).
     * Set on first scan. Future: validated against registered_devices table.
     */
    deviceId: string | null;
    /**
     * IP of the scanning device / terminal.
     * Supports audit trails when a token is scanned remotely (via mobile app).
     */
    scanIp: string | null;
    revokedAt: Date | null;
    revokedById: string | null;
    revokeReason: string | null;
    issuedById: string | null;
    createdAt: Date;
}
//# sourceMappingURL=qr-token.entity.d.ts.map