import { Repository } from 'typeorm';
import { PackageEntity, type PackageStatus } from '../entities/package.entity';
/**
 * PackageRepository — global package definition repository.
 *
 * NOTE: Does NOT extend TenantAwareRepository — packages are
 * platform-global, not tenant-scoped. There is no tenantId filter.
 * Access is controlled at the controller layer by SuperAdminGuard.
 */
export declare class PackageRepository {
    private readonly repo;
    constructor(repo: Repository<PackageEntity>);
    create(data: Partial<PackageEntity>): Promise<PackageEntity>;
    findAll(includeArchived?: boolean): Promise<PackageEntity[]>;
    findActive(): Promise<PackageEntity[]>;
    findById(id: string): Promise<PackageEntity | null>;
    findBySlug(slug: string): Promise<PackageEntity | null>;
    findByTierKey(tierKey: string): Promise<PackageEntity | null>;
    isSlugTaken(slug: string, excludeId?: string): Promise<boolean>;
    isTierKeyTaken(tierKey: string, excludeId?: string): Promise<boolean>;
    update(id: string, data: Partial<PackageEntity>): Promise<PackageEntity>;
    updateStatus(id: string, status: PackageStatus): Promise<void>;
    softDelete(id: string): Promise<void>;
    count(status?: PackageStatus): Promise<number>;
}
//# sourceMappingURL=package.repository.d.ts.map