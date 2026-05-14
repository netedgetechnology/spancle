import { EventEmitter2 } from '@nestjs/event-emitter';
import { MenuRepository } from '../repositories/menu.repository';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import type { CreateMenuDto, UpdateMenuDto, CreateMenuItemDto, UpdateMenuItemDto } from '../dto/create-menu.dto';
import { MenuEntity } from '../entities/menu.entity';
import { MenuItemEntity } from '../entities/menu-item.entity';
export declare class MenuService {
    private readonly menuRepository;
    private readonly menuItemRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(menuRepository: MenuRepository, menuItemRepository: MenuItemRepository, eventEmitter: EventEmitter2);
    create(dto: CreateMenuDto, tenantId: string, actorId: string): Promise<MenuEntity>;
    findAll(tenantId: string): Promise<MenuEntity[]>;
    findOne(id: string, tenantId: string): Promise<MenuEntity>;
    findByHandle(handle: string, tenantId: string): Promise<{
        menu: MenuEntity;
        items: MenuItemEntity[];
    }>;
    update(id: string, dto: UpdateMenuDto, tenantId: string, actorId: string): Promise<MenuEntity>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
    addItem(menuId: string, dto: CreateMenuItemDto, tenantId: string, actorId: string): Promise<MenuItemEntity>;
    updateItem(itemId: string, dto: UpdateMenuItemDto, tenantId: string, actorId: string): Promise<MenuItemEntity>;
    removeItem(itemId: string, tenantId: string, actorId: string): Promise<void>;
    getItems(menuId: string, tenantId: string): Promise<MenuItemEntity[]>;
    private validateDepth;
    private bulkCreateItems;
}
//# sourceMappingURL=menu.service.d.ts.map