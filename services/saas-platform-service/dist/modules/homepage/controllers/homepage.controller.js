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
exports.HomepageController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const homepage_service_1 = require("../services/homepage.service");
const create_homepage_section_dto_1 = require("../dto/create-homepage-section.dto");
let HomepageController = class HomepageController {
    constructor(homepageService) {
        this.homepageService = homepageService;
    }
    getPublished(pageId, req) {
        const tenantId = req.tenant?.tenantId ??
            req.tenantId ??
            req.headers['x-tenant-id'] ??
            '';
        return this.homepageService.getPublishedSections(pageId, tenantId);
    }
    getAllForAdmin(pageId, tenant) {
        return this.homepageService.getAllSections(pageId, tenant.tenantId);
    }
    getOne(id, tenant) {
        return this.homepageService.getSection(id, tenant.tenantId);
    }
    create(dto, tenant) {
        return this.homepageService.createSection(dto, tenant.tenantId, 'system');
    }
    update(id, dto, tenant) {
        return this.homepageService.updateSection(id, dto, tenant.tenantId, 'system');
    }
    remove(id, tenant) {
        return this.homepageService.removeSection(id, tenant.tenantId, 'system');
    }
    reorder(dto, tenant) {
        return this.homepageService.reorderSections(dto, tenant.tenantId, 'system');
    }
    clone(id, dto, tenant) {
        return this.homepageService.cloneSection(id, dto, tenant.tenantId, 'system');
    }
    publishAll(pageId, tenant) {
        return this.homepageService
            .publishAllDrafts(pageId, tenant.tenantId, 'system')
            .then((published) => ({ published }));
    }
};
exports.HomepageController = HomepageController;
__decorate([
    (0, common_1.Get)('pages/:pageId/sections/published'),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "getPublished", null);
__decorate([
    (0, common_1.Get)('pages/:pageId/sections'),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "getAllForAdmin", null);
__decorate([
    (0, common_1.Get)('sections/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)('sections'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_homepage_section_dto_1.CreateHomepageSectionDto, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)('sections/:id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_homepage_section_dto_1.UpdateHomepageSectionDto, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('sections/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('sections/reorder'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_homepage_section_dto_1.ReorderSectionsDto, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "reorder", null);
__decorate([
    (0, common_1.Post)('sections/:id/clone'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_homepage_section_dto_1.CloneSectionDto, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "clone", null);
__decorate([
    (0, common_1.Post)('pages/:pageId/publish-all'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('pageId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HomepageController.prototype, "publishAll", null);
exports.HomepageController = HomepageController = __decorate([
    (0, common_1.Controller)('cms/homepage'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [homepage_service_1.HomepageService])
], HomepageController);
//# sourceMappingURL=homepage.controller.js.map