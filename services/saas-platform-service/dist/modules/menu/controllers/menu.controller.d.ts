import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { MenuService } from '../services/menu.service';
import { CreateMenuDto, UpdateMenuDto, CreateMenuItemDto, UpdateMenuItemDto } from '../dto/create-menu.dto';
export declare class MenuController {
    private readonly menuService;
    constructor(menuService: MenuService);
    create(dto: CreateMenuDto, tenant: TenantContext): Promise<import("../entities/menu.entity").MenuEntity>;
    findAll(tenant: TenantContext): Promise<import("../entities/menu.entity").MenuEntity[]>;
    findByHandle(handle: string, tenant: TenantContext): Promise<{
        menu: import("../entities/menu.entity").MenuEntity;
        items: import("../entities/menu-item.entity").MenuItemEntity[];
    }>;
    findOne(id: string, tenant: TenantContext): Promise<import("../entities/menu.entity").MenuEntity>;
    update(id: string, dto: UpdateMenuDto, tenant: TenantContext): Promise<import("../entities/menu.entity").MenuEntity>;
    remove(id: string, tenant: TenantContext): Promise<void>;
    getItems(id: string, tenant: TenantContext): Promise<import("../entities/menu-item.entity").MenuItemEntity[]>;
    addItem(id: string, dto: CreateMenuItemDto, tenant: TenantContext): Promise<import("../entities/menu-item.entity").MenuItemEntity>;
    updateItem(id: string, itemId: string, dto: UpdateMenuItemDto, tenant: TenantContext): Promise<import("../entities/menu-item.entity").MenuItemEntity>;
    removeItem(_id: string, itemId: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=menu.controller.d.ts.map