"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MenuService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const menu_repository_1 = require("../repositories/menu.repository");
const menu_item_repository_1 = require("../repositories/menu-item.repository");
const menu_events_1 = require("../events/menu.events");
const MAX_MENU_DEPTH = 3;
let MenuService = MenuService_1 = class MenuService {
    constructor(menuRepository, menuItemRepository, eventEmitter) {
        this.menuRepository = menuRepository;
        this.menuItemRepository = menuItemRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(MenuService_1.name);
    }
    // ── Menus ──────────────────────────────────────────────────────────────────
    async create(dto, tenantId, actorId) {
        const handleTaken = await this.menuRepository.isHandleTaken(dto.handle, tenantId);
        if (handleTaken)
            throw new common_1.ConflictException(`Menu handle "${dto.handle}" already exists`);
        const menu = await this.menuRepository.insert({ name: dto.name, handle: dto.handle, description: dto.description, tenantId, isActive: dto.isActive ?? true }, tenantId);
        if (dto.items?.length) {
            await this.bulkCreateItems(dto.items, menu.id, tenantId);
        }
        await this.eventEmitter.emitAsync(menu_events_1.MenuEventNames.CREATED, {
            tenantId, menuId: menu.id, actorId, handle: menu.handle,
            timestamp: new Date().toISOString(),
        });
        return menu;
    }
    async findAll(tenantId) {
        return this.menuRepository.findAll(tenantId);
    }
    async findOne(id, tenantId) {
        return this.menuRepository.findByIdOrFail(id, tenantId);
    }
    async findByHandle(handle, tenantId) {
        const menu = await this.menuRepository.findByHandle(handle, tenantId);
        if (!menu)
            throw new common_1.NotFoundException(`Menu "${handle}" not found`);
        const items = await this.menuItemRepository.findByMenuId(menu.id, tenantId);
        return { menu, items };
    }
    async update(id, dto, tenantId, actorId) {
        await this.menuRepository.findByIdOrFail(id, tenantId);
        const updated = await this.menuRepository.updateById(id, dto, tenantId);
        await this.eventEmitter.emitAsync(menu_events_1.MenuEventNames.UPDATED, {
            tenantId, menuId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async remove(id, tenantId, actorId) {
        await this.menuRepository.findByIdOrFail(id, tenantId);
        await this.menuItemRepository.deleteByMenuId(id, tenantId);
        await this.menuRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(menu_events_1.MenuEventNames.DELETED, {
            tenantId, menuId: id, actorId, timestamp: new Date().toISOString(),
        });
    }
    // ── Menu Items ─────────────────────────────────────────────────────────────
    async addItem(menuId, dto, tenantId, actorId) {
        await this.menuRepository.findByIdOrFail(menuId, tenantId);
        if (dto.parentId) {
            await this.menuItemRepository.findByIdOrFail(dto.parentId, tenantId);
            await this.validateDepth(dto.parentId, tenantId);
        }
        const item = await this.menuItemRepository.insert({ ...dto, menuId, tenantId }, tenantId);
        await this.eventEmitter.emitAsync(menu_events_1.MenuEventNames.UPDATED, {
            tenantId, menuId, actorId, timestamp: new Date().toISOString(),
        });
        return item;
    }
    async updateItem(itemId, dto, tenantId, actorId) {
        const item = await this.menuItemRepository.findByIdOrFail(itemId, tenantId);
        if (dto.parentId) {
            if (dto.parentId === itemId) {
                throw new common_1.BadRequestException('A menu item cannot be its own parent');
            }
            const wouldCycle = await this.menuItemRepository.wouldCreateCycle(itemId, dto.parentId, tenantId);
            if (wouldCycle) {
                throw new common_1.BadRequestException('Setting this parent would create a circular menu tree');
            }
            await this.validateDepth(dto.parentId, tenantId);
        }
        const updated = await this.menuItemRepository.updateById(itemId, dto, tenantId);
        await this.eventEmitter.emitAsync(menu_events_1.MenuEventNames.UPDATED, {
            tenantId, menuId: item.menuId, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async removeItem(itemId, tenantId, actorId) {
        const item = await this.menuItemRepository.findByIdOrFail(itemId, tenantId);
        await this.menuItemRepository.softDelete(itemId, tenantId);
        await this.eventEmitter.emitAsync(menu_events_1.MenuEventNames.UPDATED, {
            tenantId, menuId: item.menuId, actorId, timestamp: new Date().toISOString(),
        });
    }
    async getItems(menuId, tenantId) {
        await this.menuRepository.findByIdOrFail(menuId, tenantId);
        return this.menuItemRepository.findByMenuId(menuId, tenantId);
    }
    // ── Private helpers ─────────────────────────────────────────────────────────
    async validateDepth(parentId, tenantId, currentDepth = 1) {
        if (currentDepth >= MAX_MENU_DEPTH) {
            throw new common_1.BadRequestException(`Menu nesting cannot exceed ${MAX_MENU_DEPTH} levels`);
        }
        const parent = await this.menuItemRepository.findById(parentId, tenantId);
        if (parent?.parentId) {
            await this.validateDepth(parent.parentId, tenantId, currentDepth + 1);
        }
    }
    async bulkCreateItems(items, menuId, tenantId) {
        for (const item of items) {
            await this.menuItemRepository.insert({ ...item, menuId, tenantId }, tenantId);
        }
    }
};
exports.MenuService = MenuService;
exports.MenuService = MenuService = MenuService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [menu_repository_1.MenuRepository,
        menu_item_repository_1.MenuItemRepository,
        event_emitter_1.EventEmitter2])
], MenuService);
//# sourceMappingURL=menu.service.js.map