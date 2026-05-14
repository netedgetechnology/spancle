import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { MenuItemEntity } from '../entities/menu-item.entity';
export declare class MenuItemRepository extends TenantAwareRepository<MenuItemEntity> {
    constructor(dataSource: DataSource);
    findByMenuId(menuId: string, tenantId: string): Promise<MenuItemEntity[]>;
    deleteByMenuId(menuId: string, tenantId: string): Promise<void>;
    wouldCreateCycle(itemId: string, newParentId: string, tenantId: string): Promise<boolean>;
}
//# sourceMappingURL=menu-item.repository.d.ts.map