import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { BlackoutRepository } from '../repositories/blackout.repository';
import { SlotRepository } from '../repositories/slot.repository';
import { CreateBlackoutDto } from '../dto/create-blackout.dto';
import type { BlackoutEntity } from '../entities/blackout.entity';
export declare class BlackoutController {
    private readonly blackoutRepository;
    private readonly slotRepository;
    constructor(blackoutRepository: BlackoutRepository, slotRepository: SlotRepository);
    create(dto: CreateBlackoutDto, tenant: TenantContext): Promise<BlackoutEntity>;
    findAll(tenant: TenantContext): Promise<BlackoutEntity[]>;
    findOne(id: string, tenant: TenantContext): Promise<BlackoutEntity>;
    update(id: string, dto: Partial<CreateBlackoutDto>, tenant: TenantContext): Promise<BlackoutEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=blackout.controller.d.ts.map