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
exports.RateCardController = void 0;
const common_1 = require("@nestjs/common");
const rate_card_service_1 = require("../services/rate-card.service");
const create_rate_card_dto_1 = require("../dto/create-rate-card.dto");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
let RateCardController = class RateCardController {
    constructor(rateCardService) {
        this.rateCardService = rateCardService;
    }
    create(dto, tenant, req) {
        return this.rateCardService.create(dto, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
    }
    findAll(tenant, isActive, page = '1', limit = '25') {
        return this.rateCardService.findAll(tenant.tenantId, {
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
        });
    }
    findOne(id, tenant) {
        return this.rateCardService.findById(id, tenant.tenantId);
    }
    update(id, dto, tenant, req) {
        return this.rateCardService.update(id, dto, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
    }
    activate(id, tenant, req) {
        return this.rateCardService.activate(id, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
    }
    deactivate(id, tenant, req) {
        return this.rateCardService.deactivate(id, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
    }
    remove(id, tenant, req) {
        return this.rateCardService.remove(id, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
    }
};
exports.RateCardController = RateCardController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_rate_card_dto_1.CreateRateCardDto, Object, Object]),
    __metadata("design:returntype", void 0)
], RateCardController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('isActive')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], RateCardController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RateCardController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_rate_card_dto_1.UpdateRateCardDto, Object, Object]),
    __metadata("design:returntype", void 0)
], RateCardController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RateCardController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RateCardController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], RateCardController.prototype, "remove", null);
exports.RateCardController = RateCardController = __decorate([
    (0, common_1.Controller)('rate-cards'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [rate_card_service_1.RateCardService])
], RateCardController);
//# sourceMappingURL=rate-card.controller.js.map