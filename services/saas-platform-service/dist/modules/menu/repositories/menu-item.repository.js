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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuItemRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const menu_item_entity_1 = require("../entities/menu-item.entity");
let MenuItemRepository = class MenuItemRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(menu_item_entity_1.MenuItemEntity, dataSource.manager);
    }
    async findByMenuId(menuId, tenantId) {
        return this.scopedQb('mi', tenantId)
            .andWhere('mi.menuId = :menuId', { menuId })
            .andWhere('mi.isActive = :isActive', { isActive: true })
            .orderBy('mi.sortOrder', 'ASC')
            .getMany();
    }
    async deleteByMenuId(menuId, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(menu_item_entity_1.MenuItemEntity)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where('menuId = :menuId AND tenantId = :tenantId AND isDeleted = false', { menuId, tenantId })
            .execute();
    }
    async wouldCreateCycle(itemId, newParentId, tenantId) {
        // Walk up the parent chain — if we reach itemId, it's a cycle
        let currentId = newParentId;
        const visited = new Set();
        while (currentId) {
            if (currentId === itemId)
                return true;
            if (visited.has(currentId))
                return true;
            visited.add(currentId);
            const item = await this.scopedQb('mi', tenantId)
                .andWhere('mi.id = :id', { id: currentId })
                .select(['mi.parentId'])
                .getOne();
            currentId = item?.parentId ?? null;
        }
        return false;
    }
};
exports.MenuItemRepository = MenuItemRepository;
exports.MenuItemRepository = MenuItemRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], MenuItemRepository);
//# sourceMappingURL=menu-item.repository.js.map