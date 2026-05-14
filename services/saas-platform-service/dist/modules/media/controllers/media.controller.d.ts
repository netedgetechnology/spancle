import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { MediaService } from '../services/media.service';
import { CreateMediaAssetDto, UpdateMediaAssetDto } from '../dto/create-media-asset.dto';
export declare class MediaController {
    private readonly mediaService;
    constructor(mediaService: MediaService);
    /**
     * POST /api/v1/cms/media/register
     * Registers an already-uploaded file's metadata.
     * File upload (multipart) handled by a dedicated upload endpoint (Sprint 3).
     */
    register(dto: CreateMediaAssetDto, tenant: TenantContext): Promise<import("../entities/media-asset.entity").MediaAssetEntity>;
    findAll(tenant: TenantContext, page?: string, limit?: string, assetType?: string): Promise<{
        data: import("../entities/media-asset.entity").MediaAssetEntity[];
        total: number;
    }>;
    findOne(id: string, tenant: TenantContext): Promise<import("../entities/media-asset.entity").MediaAssetEntity>;
    update(id: string, dto: UpdateMediaAssetDto, tenant: TenantContext): Promise<import("../entities/media-asset.entity").MediaAssetEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=media.controller.d.ts.map