import type { Repository } from 'typeorm';
import { TenantEntity } from '../entities/tenant.entity';
export declare class TenantRepository {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<TenantEntity>);
    create(data: Partial<TenantEntity>): Promise<TenantEntity>;
    findAllByTenant(tenantId: string): Promise<TenantEntity[]>;
    findByIdAndTenant(id: string, tenantId: string): Promise<TenantEntity | null>;
    update(id: string, tenantId: string, data: Partial<TenantEntity>): Promise<TenantEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=tenant.repository.d.ts.map