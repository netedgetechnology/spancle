/**
 * QrModule — QR token issuance, validation, and smart-access verification.
 *
 * Imports BookingModule for:
 *   BookingRepository  — booking existence / status checks
 *   BookingService     — triggers checkIn() on successful scan
 *
 * CacheModule: Redis-backed, scoped to this module.
 *   Keys:  tenant:{tenantId}:qr:{tokenHash} — issued token metadata
 *          qr:verify:{tokenHash}             — public verify cache
 *   TTL: inherits token expiresAt, capped at 24 h.
 */
export declare class QrModule {
}
//# sourceMappingURL=qr.module.d.ts.map