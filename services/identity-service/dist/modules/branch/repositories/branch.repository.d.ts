import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { BranchEntity, type BranchStatus } from '../entities/branch.entity';
export declare class BranchRepository extends TenantAwareRepository<BranchEntity> {
    constructor(dataSource: DataSource);
    findBySlug(slug: string, tenantId: string): Promise<BranchEntity | null>;
    findByStatus(status: BranchStatus, tenantId: string): Promise<BranchEntity[]>;
    findByManager(managerUserId: string, tenantId: string): Promise<BranchEntity[]>;
    isSlugTaken(slug: string, tenantId: string, excludeId?: string): Promise<boolean>;
    countByStatus(tenantId: string): Promise<Record<BranchStatus, number>>;
}
//# sourceMappingURL=branch.repository.d.ts.map