export type ScanOutcome = 'granted' | 'denied_expired' | 'denied_revoked' | 'denied_used' | 'denied_mismatch' | 'denied_not_found' | 'denied_status' | 'denied_too_early' | 'error';
/**
 * QrScanLogEntity — immutable audit log of every QR scan event.
 * INSERT only — no UPDATE, no soft-delete.
 *
 * Used for:
 *   - Compliance audit of physical access events
 *   - Debugging scanner/device misconfigurations
 *   - Fraud detection (unusual scan patterns)
 *   - Smart access device performance monitoring
 *
 * Table: qr_scan_logs
 */
export declare class QrScanLogEntity {
    id: string;
    tenantId: string;
    /** The token record that was scanned — null if tokenHash not found */
    tokenId: string | null;
    /** Raw hash presented by scanner — always stored for denied_not_found cases */
    tokenHashPresented: string;
    bookingId: string | null;
    branchId: string | null;
    courtId: string | null;
    outcome: ScanOutcome;
    /** Human-readable denial reason for device display */
    denialReason: string | null;
    /** ID of the physical device/controller that performed the scan */
    deviceId: string | null;
    /** Device-reported firmware version — for smart-access compatibility tracking */
    deviceFirmware: string | null;
    scanIp: string | null;
    /** Duration of the verification in milliseconds */
    verificationMs: number | null;
    createdAt: Date;
}
//# sourceMappingURL=qr-scan-log.entity.d.ts.map