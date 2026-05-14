import { DataSource } from 'typeorm';
import { SlotTemplateEntity } from '../entities/slot-template.entity';
export declare class SlotTemplateRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    private scopedQb;
    create(data: Partial<SlotTemplateEntity>): Promise<SlotTemplateEntity>;
    findById(id: string, tenantId: string): Promise<SlotTemplateEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<SlotTemplateEntity>;
    findByCourt(courtId: string, tenantId: string): Promise<SlotTemplateEntity[]>;
    findActiveForCourt(courtId: string, tenantId: string): Promise<SlotTemplateEntity | null>;
    findAllActive(tenantId: string): Promise<SlotTemplateEntity[]>;
    findAll(tenantId: string): Promise<SlotTemplateEntity[]>;
    updateById(id: string, tenantId: string, data: Partial<SlotTemplateEntity>): Promise<SlotTemplateEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=slot-template.repository.d.ts.map