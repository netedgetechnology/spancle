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
exports.MenuController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const menu_service_1 = require("../services/menu.service");
const create_menu_dto_1 = require("../dto/create-menu.dto");
let MenuController = class MenuController {
    constructor(menuService) {
        this.menuService = menuService;
    }
    // ── Menus ──────────────────────────────────────────────────────────────────
    create(dto, tenant) {
        return this.menuService.create(dto, tenant.tenantId, 'system');
    }
    findAll(tenant) {
        return this.menuService.findAll(tenant.tenantId);
    }
    findByHandle(handle, tenant) {
        return this.menuService.findByHandle(handle, tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.menuService.findOne(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.menuService.update(id, dto, tenant.tenantId, 'system');
    }
    remove(id, tenant) {
        return this.menuService.remove(id, tenant.tenantId, 'system');
    }
    // ── Menu Items ─────────────────────────────────────────────────────────────
    getItems(id, tenant) {
        return this.menuService.getItems(id, tenant.tenantId);
    }
    addItem(id, dto, tenant) {
        return this.menuService.addItem(id, dto, tenant.tenantId, 'system');
    }
    updateItem(id, itemId, dto, tenant) {
        return this.menuService.updateItem(itemId, dto, tenant.tenantId, 'system');
    }
    removeItem(_id, itemId, tenant) {
        return this.menuService.removeItem(itemId, tenant.tenantId, 'system');
    }
};
exports.MenuController = MenuController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_menu_dto_1.CreateMenuDto, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('by-handle/:handle'),
    __param(0, (0, common_1.Param)('handle')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "findByHandle", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_menu_dto_1.UpdateMenuDto, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/items'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "getItems", null);
__decorate([
    (0, common_1.Post)(':id/items'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_menu_dto_1.CreateMenuItemDto, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "addItem", null);
__decorate([
    (0, common_1.Patch)(':id/items/:itemId'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, create_menu_dto_1.UpdateMenuItemDto, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "updateItem", null);
__decorate([
    (0, common_1.Delete)(':id/items/:itemId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('itemId', common_1.ParseUUIDPipe)),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MenuController.prototype, "removeItem", null);
exports.MenuController = MenuController = __decorate([
    (0, common_1.Controller)('cms/menus'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [menu_service_1.MenuService])
], MenuController);
//# sourceMappingURL=menu.controller.js.map