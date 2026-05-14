import type { Repository } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
export declare class RoleRepository {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<RoleEntity>);
    create(data: Partial<RoleEntity>): Promise<RoleEntity>;
    findAllByTenant(tenantId: string): Promise<RoleEntity[]>;
    findByIdAndTenant(id: string, tenantId: string): Promise<RoleEntity | null>;
    update(id: string, tenantId: string, data: Partial<RoleEntity>): Promise<RoleEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=role.repository.d.ts.map