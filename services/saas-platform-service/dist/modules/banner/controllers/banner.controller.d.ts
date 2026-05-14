import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { BannerService } from '../services/banner.service';
import { CreateBannerDto, UpdateBannerDto } from '../dto/create-banner.dto';
export declare class BannerController {
    private readonly bannerService;
    constructor(bannerService: BannerService);
    create(dto: CreateBannerDto, tenant: TenantContext): Promise<import("../entities/banner.entity").BannerEntity>;
    findAll(tenant: TenantContext, placement?: string, status?: string): Promise<import("../entities/banner.entity").BannerEntity[]>;
    findByKey(key: string, tenant: TenantContext): Promise<import("../entities/banner.entity").BannerEntity>;
    findOne(id: string, tenant: TenantContext): Promise<import("../entities/banner.entity").BannerEntity>;
    update(id: string, dto: UpdateBannerDto, tenant: TenantContext): Promise<import("../entities/banner.entity").BannerEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=banner.controller.d.ts.map