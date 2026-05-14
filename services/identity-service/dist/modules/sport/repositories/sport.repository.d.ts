import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { SportEntity, type SportStatus } from '../entities/sport.entity';
export declare class SportRepository extends TenantAwareRepository<SportEntity> {
    constructor(dataSource: DataSource);
    findBySlug(slug: string, tenantId: string): Promise<SportEntity | null>;
    findByStatus(status: SportStatus, tenantId: string): Promise<SportEntity[]>;
    /**
     * Returns all sports assigned to a specific branch (via sport_branches join).
     * Only active sports are returned.
     */
    findByBranch(branchId: string, tenantId: string): Promise<SportEntity[]>;
    isSlugTaken(slug: string, tenantId: string, excludeId?: string): Promise<boolean>;
    countByStatus(tenantId: string): Promise<Record<SportStatus, number>>;
}
//# sourceMappingURL=sport.repository.d.ts.map