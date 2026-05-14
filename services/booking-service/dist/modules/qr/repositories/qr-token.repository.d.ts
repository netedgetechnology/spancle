import { DataSource } from 'typeorm';
import { QrTokenEntity, type QrTokenStatus } from '../entities/qr-token.entity';
import { QrScanLogEntity, type ScanOutcome } from '../entities/qr-scan-log.entity';
export declare class QrTokenRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    private get scanRepo();
    create(data: Partial<QrTokenEntity>): Promise<QrTokenEntity>;
    findById(id: string, tenantId: string): Promise<QrTokenEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<QrTokenEntity>;
    /**
     * Primary lookup path — O(1) via UNIQUE index on token_hash.
     * Called on every scan; must be fast.
     */
    findByHash(tokenHash: string): Promise<QrTokenEntity | null>;
    findByBooking(bookingId: string, tenantId: string): Promise<QrTokenEntity[]>;
    findActiveForBooking(bookingId: string, tenantId: string): Promise<QrTokenEntity | null>;
    /**
     * Increments useCount and conditionally marks as 'used' when maxUses reached.
     * Atomic: uses a single UPDATE with computed status.
     */
    recordUsage(id: string, tenantId: string, deviceId: string | null, scanIp: string | null): Promise<QrTokenEntity>;
    updateStatus(id: string, tenantId: string, status: QrTokenStatus, extra?: Partial<Pick<QrTokenEntity, 'revokedAt' | 'revokedById' | 'revokeReason'>>): Promise<void>;
    /**
     * Bulk-expires all active tokens whose expiresAt has passed.
     * Called by a scheduled job.
     */
    bulkExpireStale(): Promise<number>;
    logScan(data: {
        tenantId: string;
        tokenId: string | null;
        tokenHashPresented: string;
        bookingId: string | null;
        branchId: string | null;
        courtId: string | null;
        outcome: ScanOutcome;
        denialReason: string | null;
        deviceId: string | null;
        deviceFirmware: string | null;
        scanIp: string | null;
        verificationMs: number | null;
    }): Promise<void>;
    findScanLogs(tenantId: string, bookingId: string): Promise<QrScanLogEntity[]>;
    findScanLogsByDevice(tenantId: string, deviceId: string, from?: Date, to?: Date): Promise<QrScanLogEntity[]>;
}
//# sourceMappingURL=qr-token.repository.d.ts.map