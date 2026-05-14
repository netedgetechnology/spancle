import type { Repository } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
export declare class UserRepository {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<UserEntity>);
    create(data: Partial<UserEntity>): Promise<UserEntity>;
    findAllByTenant(tenantId: string): Promise<UserEntity[]>;
    findByIdAndTenant(id: string, tenantId: string): Promise<UserEntity | null>;
    update(id: string, tenantId: string, data: Partial<UserEntity>): Promise<UserEntity>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=user.repository.d.ts.map