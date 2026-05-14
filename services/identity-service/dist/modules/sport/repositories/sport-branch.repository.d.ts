import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { SportBranchEntity } from '../entities/sport-branch.entity';
export declare class SportBranchRepository extends TenantAwareRepository<SportBranchEntity> {
    constructor(dataSource: DataSource);
    /**
     * Returns all active branch mappings for a sport.
     */
    findBySport(sportId: string, tenantId: string): Promise<SportBranchEntity[]>;
    /**
     * Returns all active sport mappings for a branch.
     */
    findByBranch(branchId: string, tenantId: string): Promise<SportBranchEntity[]>;
    /**
     * Returns the branchIds currently mapped to a sport (non-deleted only).
     */
    getBranchIdsForSport(sportId: string, tenantId: string): Promise<string[]>;
    /**
     * Replace-strategy assignment — atomically replaces the full set of
     * branch mappings for a sport.
     *
     * Steps:
     *   1. Soft-delete all existing mappings for this sport
     *   2. Insert new mappings with sortOrder from array position
     *
     * Both steps operate under the tenantId scope.
     */
    replaceBranchMappings(sportId: string, branchIds: string[], tenantId: string): Promise<void>;
    /**
     * Soft-deletes all branch mappings for a sport.
     * Called before sport deletion to prevent orphaned join rows.
     */
    deleteAllForSport(sportId: string, tenantId: string): Promise<void>;
    existsMapping(sportId: string, branchId: string, tenantId: string): Promise<boolean>;
}
//# sourceMappingURL=sport-branch.repository.d.ts.map