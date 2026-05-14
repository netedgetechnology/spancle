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
exports.SlotTemplateController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const slot_guard_1 = require("../guards/slot.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const slot_template_repository_1 = require("../repositories/slot-template.repository");
const create_slot_template_dto_1 = require("../dto/create-slot-template.dto");
let SlotTemplateController = class SlotTemplateController {
    constructor(templateRepository) {
        this.templateRepository = templateRepository;
    }
    create(dto, tenant) {
        return this.templateRepository.create({ ...dto, tenantId: tenant.tenantId, isActive: true, isDeleted: false });
    }
    findAll(tenant) {
        return this.templateRepository.findAll(tenant.tenantId);
    }
    findByCourt(courtId, tenant) {
        return this.templateRepository.findByCourt(courtId, tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.templateRepository.findByIdOrFail(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.templateRepository.updateById(id, tenant.tenantId, dto);
    }
    remove(id, tenant) {
        return this.templateRepository.softDelete(id, tenant.tenantId);
    }
};
exports.SlotTemplateController = SlotTemplateController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_slot_template_dto_1.CreateSlotTemplateDto, Object]),
    __metadata("design:returntype", void 0)
], SlotTemplateController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SlotTemplateController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('court/:courtId'),
    __param(0, (0, common_1.Param)('courtId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SlotTemplateController.prototype, "findByCourt", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SlotTemplateController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], SlotTemplateController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SlotTemplateController.prototype, "remove", null);
exports.SlotTemplateController = SlotTemplateController = __decorate([
    (0, common_1.Controller)('slot-templates'),
    (0, common_1.UseGuards)(slot_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [slot_template_repository_1.SlotTemplateRepository])
], SlotTemplateController);
//# sourceMappingURL=slot-template.controller.js.map