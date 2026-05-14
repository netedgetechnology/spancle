import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { MenuEntity } from '../entities/menu.entity';
export declare class MenuRepository extends TenantAwareRepository<MenuEntity> {
    constructor(dataSource: DataSource);
    findByHandle(handle: string, tenantId: string): Promise<MenuEntity | null>;
    isHandleTaken(handle: string, tenantId: string, excludeId?: string): Promise<boolean>;
}
//# sourceMappingURL=menu.repository.d.ts.map