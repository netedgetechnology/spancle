import { DataSource } from 'typeorm';
import { PricingRuleEntity } from '../entities/pricing-rule.entity';
export declare class PricingRuleRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    private scopedQb;
    create(data: Partial<PricingRuleEntity>): Promise<PricingRuleEntity>;
    findById(id: string, tenantId: string): Promise<PricingRuleEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<PricingRuleEntity>;
    findAll(tenantId: string, includeInactive?: boolean): Promise<PricingRuleEntity[]>;
    /**
     * Core pricing query — finds all active rules that apply to a slot.
     *
     * Matching criteria:
     *   - Scope matches (tenant wildcard, or specific branch/sport/court)
     *   - Date range contains slotDate (or open-ended)
     *   - Day of week matches (or daysOfWeek is null/empty = all days)
     *   - Time window contains slotStartTime (or time fields are null = all day)
     *
     * Returns rules sorted by priority DESC so the service can apply them
     * in the correct order.
     */
    findMatchingRules(params: {
        tenantId: string;
        courtId: string;
        branchId: string;
        sportId: string | null;
        slotDate: string;
        slotTime: string;
        dayOfWeek: string;
    }): Promise<PricingRuleEntity[]>;
    updateById(id: string, tenantId: string, data: Partial<PricingRuleEntity>): Promise<PricingRuleEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=pricing-rule.repository.d.ts.map