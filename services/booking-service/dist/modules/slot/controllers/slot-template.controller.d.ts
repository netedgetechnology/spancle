import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { SlotTemplateRepository } from '../repositories/slot-template.repository';
import { CreateSlotTemplateDto } from '../dto/create-slot-template.dto';
import type { SlotTemplateEntity } from '../entities/slot-template.entity';
export declare class SlotTemplateController {
    private readonly templateRepository;
    constructor(templateRepository: SlotTemplateRepository);
    create(dto: CreateSlotTemplateDto, tenant: TenantContext): Promise<SlotTemplateEntity>;
    findAll(tenant: TenantContext): Promise<SlotTemplateEntity[]>;
    findByCourt(courtId: string, tenant: TenantContext): Promise<SlotTemplateEntity[]>;
    findOne(id: string, tenant: TenantContext): Promise<SlotTemplateEntity>;
    update(id: string, dto: Partial<CreateSlotTemplateDto>, tenant: TenantContext): Promise<SlotTemplateEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=slot-template.controller.d.ts.map