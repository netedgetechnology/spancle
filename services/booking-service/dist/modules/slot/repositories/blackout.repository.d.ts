import { DataSource } from 'typeorm';
import { BlackoutEntity } from '../entities/blackout.entity';
export declare class BlackoutRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    private scopedQb;
    create(data: Partial<BlackoutEntity>): Promise<BlackoutEntity>;
    findById(id: string, tenantId: string): Promise<BlackoutEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<BlackoutEntity>;
    findAll(tenantId: string): Promise<BlackoutEntity[]>;
    /**
     * Checks whether a specific datetime window is blocked by any active blackout
     * that applies to the given court/branch/tenant scope.
     *
     * A blackout blocks the window if:
     *   - blackout.startAt < windowEnd AND blackout.endAt > windowStart (overlap)
     *   - Scope: tenant wildcard OR matching branchId/courtId/sportId
     */
    isBlocked(params: {
        tenantId: string;
        courtId: string;
        branchId: string;
        sportId?: string;
        startAt: Date;
        endAt: Date;
    }): Promise<boolean>;
    /**
     * Returns all active blackouts that overlap with the given window.
     * Used by SlotGeneratorService to pre-fetch all blackouts for a date range.
     */
    findOverlapping(params: {
        tenantId: string;
        courtId: string;
        branchId: string;
        sportId?: string;
        startAt: Date;
        endAt: Date;
    }): Promise<BlackoutEntity[]>;
    updateById(id: string, tenantId: string, data: Partial<BlackoutEntity>): Promise<BlackoutEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=blackout.repository.d.ts.map