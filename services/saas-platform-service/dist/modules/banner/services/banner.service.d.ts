import { EventEmitter2 } from '@nestjs/event-emitter';
import { BannerRepository } from '../repositories/banner.repository';
import type { CreateBannerDto, UpdateBannerDto } from '../dto/create-banner.dto';
import { BannerEntity } from '../entities/banner.entity';
export declare class BannerService {
    private readonly bannerRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(bannerRepository: BannerRepository, eventEmitter: EventEmitter2);
    create(dto: CreateBannerDto, tenantId: string, actorId: string): Promise<BannerEntity>;
    findAll(tenantId: string, placement?: string, status?: string): Promise<BannerEntity[]>;
    findOne(id: string, tenantId: string): Promise<BannerEntity>;
    findByKey(key: string, tenantId: string): Promise<BannerEntity>;
    update(id: string, dto: UpdateBannerDto, tenantId: string, actorId: string): Promise<BannerEntity>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
}
//# sourceMappingURL=banner.service.d.ts.map