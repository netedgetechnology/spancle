declare const QR_PURPOSES: readonly ["booking_checkin", "access_gate", "locker_unlock", "equipment_room", "visitor_pass"];
export declare class IssueQrTokenDto {
    /** Target booking — validated to belong to tenant in service layer */
    bookingId: string;
    purpose?: typeof QR_PURPOSES[number];
    /**
     * Token validity window in minutes from now.
     * Default: 1440 (24 hours).
     * Max:    10080 (7 days — for recurring series multi-day passes).
     */
    ttlMinutes?: number;
    /**
     * How many times the token may be successfully scanned.
     * Default: 1 (single check-in).
     * Use > 1 for group sessions or recurring slot passes.
     */
    maxUses?: number;
}
export declare class ScanQrTokenDto {
    /** The raw token string returned at issuance (NOT the hash) */
    token: string;
    /**
     * Physical device ID of the scanner.
     * Required for smart-access devices; optional for mobile app scans.
     * Future: cross-referenced against registered_devices table.
     */
    deviceId?: string;
    /**
     * Device firmware version — used to detect outdated scanners.
     * Future: devices below minimum firmware version trigger a soft warning.
     */
    deviceFirmware?: string;
    /**
     * Court the device claims to be installed at.
     * Validated against the token's courtId to prevent cross-court access.
     * Required for access_gate purpose.
     */
    claimedCourtId?: string;
    claimedBranchId?: string;
}
export declare class RevokeQrTokenDto {
    reason: string;
}
export declare class VerifyQrTokenDto {
    token: string;
    deviceId?: string;
    claimedCourtId?: string;
}
export {};
//# sourceMappingURL=qr-token.dto.d.ts.map