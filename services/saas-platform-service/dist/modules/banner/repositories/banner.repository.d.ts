import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { BannerEntity, type BannerPlacement, type BannerStatus } from '../entities/banner.entity';
export declare class BannerRepository extends TenantAwareRepository<BannerEntity> {
    constructor(dataSource: DataSource);
    findByPlacement(placement: BannerPlacement, tenantId: string): Promise<BannerEntity[]>;
    findByStatus(status: BannerStatus, tenantId: string): Promise<BannerEntity[]>;
    findByKey(key: string, tenantId: string): Promise<BannerEntity | null>;
}
//# sourceMappingURL=banner.repository.d.ts.map