import { DataSource } from 'typeorm';
import { BookingEntity, type BookingStatus } from '../entities/booking.entity';
export interface BookingQueryParams {
    tenantId: string;
    branchId?: string;
    courtId?: string;
    sportId?: string;
    userId?: string;
    status?: BookingStatus;
    from?: Date;
    to?: Date;
    reference?: string;
    limit?: number;
    offset?: number;
}
export declare class BookingRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    private scopedQb;
    create(data: Partial<BookingEntity>): Promise<BookingEntity>;
    findById(id: string, tenantId: string): Promise<BookingEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<BookingEntity>;
    findByReference(reference: string, tenantId: string): Promise<BookingEntity | null>;
    query(params: BookingQueryParams): Promise<BookingEntity[]>;
    updateById(id: string, tenantId: string, data: Partial<BookingEntity>): Promise<BookingEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
    countByStatus(tenantId: string): Promise<Record<BookingStatus, number>>;
    findConfirmedOverlapping(params: {
        tenantId: string;
        courtId: string;
        startsAt: Date;
        endsAt: Date;
        excludeId?: string;
    }): Promise<BookingEntity[]>;
    /**
     * Finds all confirmed bookings for a user that start within the given range.
     * Used by recurring booking generation to detect duplicates.
     */
    findByUserInRange(params: {
        tenantId: string;
        userId: string;
        courtId: string;
        from: Date;
        to: Date;
    }): Promise<BookingEntity[]>;
    /**
     * Finds all confirmed bookings that started before now and are still 'confirmed'.
     * Called by the scheduler to mark completed bookings.
     */
    findPastConfirmed(tenantId: string, before: Date): Promise<BookingEntity[]>;
    /**
     * Finds confirmed bookings where the session started but no check-in occurred.
     * Used for no-show detection.
     */
    findNoShowCandidates(tenantId: string, gracePeriodMinutes?: number): Promise<BookingEntity[]>;
}
//# sourceMappingURL=booking.repository.d.ts.map