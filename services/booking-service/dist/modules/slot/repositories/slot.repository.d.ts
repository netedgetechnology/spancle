import { type EntityManager, DataSource } from 'typeorm';
import { SlotEntity, type SlotStatus } from '../entities/slot.entity';
/**
 * SlotRepository — tenant-scoped slot data access.
 *
 * All methods enforce tenantId scoping on every query.
 * Overlap detection uses a range query (startAt < endAt AND endAt > startAt)
 * which correctly handles partial, full, and exact overlaps.
 */
export declare class SlotRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    private scopedQb;
    create(data: Partial<SlotEntity>): Promise<SlotEntity>;
    insertMany(data: Partial<SlotEntity>[]): Promise<SlotEntity[]>;
    findById(id: string, tenantId: string): Promise<SlotEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<SlotEntity>;
    updateById(id: string, tenantId: string, data: Partial<SlotEntity>): Promise<SlotEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
    query(params: {
        tenantId: string;
        courtId?: string;
        branchId?: string;
        sportId?: string;
        from?: Date;
        to?: Date;
        status?: SlotStatus;
    }): Promise<SlotEntity[]>;
    /**
     * Counts existing non-cancelled slots that overlap with [startAt, endAt).
     * Used as the pre-generation soft check. DB unique index is the hard guard.
     *
     * Overlap condition: existing.startAt < newEndAt AND existing.endAt > newStartAt
     */
    countOverlapping(params: {
        tenantId: string;
        courtId: string;
        startAt: Date;
        endAt: Date;
        excludeId?: string;
    }): Promise<number>;
    /**
     * Returns all non-cancelled slots in the time window for a court.
     * Used by generator to collect existing slot times before inserting.
     */
    findInRange(params: {
        tenantId: string;
        courtId: string;
        startAt: Date;
        endAt: Date;
    }): Promise<{
        startAt: Date;
        endAt: Date;
    }[]>;
    /**
     * Bulk-cancels available slots within a time window for a court/branch.
     * Used when a blackout is activated with cancelExistingSlots = true.
     * Never cancels 'booked' slots — those require explicit admin action.
     */
    bulkCancelAvailable(params: {
        tenantId: string;
        startAt: Date;
        endAt: Date;
        courtId?: string;
        branchId?: string;
    }): Promise<number>;
    /**
     * Expires stale 'reserved' slots where reservedUntil has passed.
     * Called by the scheduler every minute.
     */
    expireStaleReservations(tenantId: string): Promise<number>;
    countByStatus(tenantId: string): Promise<Record<SlotStatus, number>>;
    /**
     * Acquires a pessimistic write lock on slots by IDs within a transaction.
     * Returns slot entities if ALL are still in an available/reserved state.
     * Throws ConflictException if any slot has been taken since the outer validation.
     *
     * MUST be called inside a DataSource.transaction() block with the manager's
     * EntityManager — the manager passed here IS the transaction scope.
     */
    lockAndVerifyAvailable(slotIds: string[], tenantId: string, manager: EntityManager): Promise<SlotEntity[]>;
}
//# sourceMappingURL=slot.repository.d.ts.map