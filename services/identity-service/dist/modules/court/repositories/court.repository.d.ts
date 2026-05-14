import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { CourtEntity, type CourtStatus } from '../entities/court.entity';
export declare class CourtRepository extends TenantAwareRepository<CourtEntity> {
    constructor(dataSource: DataSource);
    findByBranch(branchId: string, tenantId: string, status?: CourtStatus): Promise<CourtEntity[]>;
    findBySport(sportId: string, tenantId: string, branchId?: string): Promise<CourtEntity[]>;
    findByStatus(status: CourtStatus, tenantId: string): Promise<CourtEntity[]>;
    isNameTakenInBranch(name: string, branchId: string, tenantId: string, excludeId?: string): Promise<boolean>;
    /** Returns all names currently in use for a branch — used by bulk generation */
    getExistingNamesForBranch(branchId: string, tenantId: string): Promise<Set<string>>;
    countByBranch(branchId: string, tenantId: string): Promise<number>;
    countByStatus(tenantId: string): Promise<Record<CourtStatus, number>>;
    /** Returns count of courts in maintenance across all branches */
    countInMaintenance(tenantId: string): Promise<number>;
}
//# sourceMappingURL=court.repository.d.ts.map