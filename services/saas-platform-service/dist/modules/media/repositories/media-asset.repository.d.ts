import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { MediaAssetEntity, type MediaAssetType } from '../entities/media-asset.entity';
export declare class MediaAssetRepository extends TenantAwareRepository<MediaAssetEntity> {
    constructor(dataSource: DataSource);
    findByType(assetType: MediaAssetType, tenantId: string, page?: number, limit?: number): Promise<{
        data: MediaAssetEntity[];
        total: number;
    }>;
    findOrphaned(tenantId: string): Promise<MediaAssetEntity[]>;
    adjustReferenceCount(id: string, tenantId: string, delta: 1 | -1): Promise<void>;
    findByStoredName(storedName: string, tenantId: string): Promise<MediaAssetEntity | null>;
    findPaginated(tenantId: string, page?: number, limit?: number, alias?: string): Promise<{
        data: MediaAssetEntity[];
        total: number;
    }>;
}
//# sourceMappingURL=media-asset.repository.d.ts.map