import {
  BadRequestException, ConflictException, Injectable,
  Logger, NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MenuRepository } from '../repositories/menu.repository';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import type {
  CreateMenuDto, UpdateMenuDto,
  CreateMenuItemDto, UpdateMenuItemDto,
} from '../dto/create-menu.dto';
import { MenuEntity } from '../entities/menu.entity';
import { MenuItemEntity } from '../entities/menu-item.entity';
import { MenuEventNames } from '../events/menu.events';

const MAX_MENU_DEPTH = 3;

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(
    private readonly menuRepository:     MenuRepository,
    private readonly menuItemRepository: MenuItemRepository,
    private readonly eventEmitter:       EventEmitter2,
  ) {}

  // ── Menus ──────────────────────────────────────────────────────────────────

  async create(dto: CreateMenuDto, tenantId: string, actorId: string): Promise<MenuEntity> {
    const handleTaken = await this.menuRepository.isHandleTaken(dto.handle, tenantId);
    if (handleTaken) throw new ConflictException(`Menu handle "${dto.handle}" already exists`);

    const menu = await this.menuRepository.insert(
      { name: dto.name, handle: dto.handle, description: dto.description, tenantId, isActive: dto.isActive ?? true } as any,
      tenantId,
    );

    if (dto.items?.length) {
      await this.bulkCreateItems(dto.items, menu.id, tenantId);
    }

    await this.eventEmitter.emitAsync(MenuEventNames.CREATED, {
      tenantId, menuId: menu.id, actorId, handle: menu.handle,
      timestamp: new Date().toISOString(),
    });

    return menu;
  }

  async findAll(tenantId: string): Promise<MenuEntity[]> {
    return this.menuRepository.findAll(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<MenuEntity> {
    return this.menuRepository.findByIdOrFail(id, tenantId);
  }

  async findByHandle(handle: string, tenantId: string): Promise<{ menu: MenuEntity; items: MenuItemEntity[] }> {
    const menu = await this.menuRepository.findByHandle(handle, tenantId);
    if (!menu) throw new NotFoundException(`Menu "${handle}" not found`);
    const items = await this.menuItemRepository.findByMenuId(menu.id, tenantId);
    return { menu, items };
  }

  async update(id: string, dto: UpdateMenuDto, tenantId: string, actorId: string): Promise<MenuEntity> {
    await this.menuRepository.findByIdOrFail(id, tenantId);
    const updated = await this.menuRepository.updateById(
      id,
      dto as unknown as Parameters<typeof this.menuRepository.updateById>[1],
      tenantId,
    );
    await this.eventEmitter.emitAsync(MenuEventNames.UPDATED, {
      tenantId, menuId: id, actorId, timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    await this.menuRepository.findByIdOrFail(id, tenantId);
    await this.menuItemRepository.deleteByMenuId(id, tenantId);
    await this.menuRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(MenuEventNames.DELETED, {
      tenantId, menuId: id, actorId, timestamp: new Date().toISOString(),
    });
  }

  // ── Menu Items ─────────────────────────────────────────────────────────────

  async addItem(menuId: string, dto: CreateMenuItemDto, tenantId: string, actorId: string): Promise<MenuItemEntity> {
    await this.menuRepository.findByIdOrFail(menuId, tenantId);

    if (dto.parentId) {
      await this.menuItemRepository.findByIdOrFail(dto.parentId, tenantId);
      await this.validateDepth(dto.parentId, tenantId);
    }

    const item = await this.menuItemRepository.insert(
      { ...dto, menuId, tenantId } as unknown as Parameters<typeof this.menuItemRepository.insert>[0],
      tenantId,
    );

    await this.eventEmitter.emitAsync(MenuEventNames.UPDATED, {
      tenantId, menuId, actorId, timestamp: new Date().toISOString(),
    });

    return item;
  }

  async updateItem(itemId: string, dto: UpdateMenuItemDto, tenantId: string, actorId: string): Promise<MenuItemEntity> {
    const item = await this.menuItemRepository.findByIdOrFail(itemId, tenantId);

    if (dto.parentId) {
      if (dto.parentId === itemId) {
        throw new BadRequestException('A menu item cannot be its own parent');
      }
      const wouldCycle = await this.menuItemRepository.wouldCreateCycle(itemId, dto.parentId, tenantId);
      if (wouldCycle) {
        throw new BadRequestException('Setting this parent would create a circular menu tree');
      }
      await this.validateDepth(dto.parentId, tenantId);
    }

    const updated = await this.menuItemRepository.updateById(
      itemId,
      dto as unknown as Parameters<typeof this.menuItemRepository.updateById>[1],
      tenantId,
    );

    await this.eventEmitter.emitAsync(MenuEventNames.UPDATED, {
      tenantId, menuId: item.menuId, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async removeItem(itemId: string, tenantId: string, actorId: string): Promise<void> {
    const item = await this.menuItemRepository.findByIdOrFail(itemId, tenantId);
    await this.menuItemRepository.softDelete(itemId, tenantId);
    await this.eventEmitter.emitAsync(MenuEventNames.UPDATED, {
      tenantId, menuId: item.menuId, actorId, timestamp: new Date().toISOString(),
    });
  }

  async getItems(menuId: string, tenantId: string): Promise<MenuItemEntity[]> {
    await this.menuRepository.findByIdOrFail(menuId, tenantId);
    return this.menuItemRepository.findByMenuId(menuId, tenantId);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private async validateDepth(parentId: string, tenantId: string, currentDepth = 1): Promise<void> {
    if (currentDepth >= MAX_MENU_DEPTH) {
      throw new BadRequestException(`Menu nesting cannot exceed ${MAX_MENU_DEPTH} levels`);
    }
    const parent = await this.menuItemRepository.findById(parentId, tenantId);
    if (parent?.parentId) {
      await this.validateDepth(parent.parentId, tenantId, currentDepth + 1);
    }
  }

  private async bulkCreateItems(
    items: CreateMenuItemDto[],
    menuId: string,
    tenantId: string,
  ): Promise<void> {
    for (const item of items) {
      await this.menuItemRepository.insert(
        { ...item, menuId, tenantId } as unknown as Parameters<typeof this.menuItemRepository.insert>[0],
        tenantId,
      );
    }
  }
}
