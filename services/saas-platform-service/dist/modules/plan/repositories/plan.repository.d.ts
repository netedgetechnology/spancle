import { Repository } from 'typeorm';
import { PlanEntity } from '../entities/plan.entity';
export declare class PlanRepository {
    private readonly repo;
    constructor(repo: Repository<PlanEntity>);
    create(data: Partial<PlanEntity>): Promise<PlanEntity>;
    findByTenant(tenantId: string): Promise<PlanEntity | null>;
    findById(id: string): Promise<PlanEntity | null>;
    update(id: string, data: Partial<PlanEntity>): Promise<PlanEntity>;
    deactivateByTenant(tenantId: string): Promise<void>;
    softDelete(id: string): Promise<void>;
}
//# sourceMappingURL=plan.repository.d.ts.map