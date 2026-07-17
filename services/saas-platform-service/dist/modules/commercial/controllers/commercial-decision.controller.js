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
exports.CommercialDecisionController = void 0;
const common_1 = require("@nestjs/common");
const super_admin_guard_1 = require("../../admin/guards/super-admin.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const commercial_decision_service_1 = require("../services/commercial-decision.service");
const commercial_decision_dto_1 = require("../dto/commercial-decision.dto");
let CommercialDecisionController = class CommercialDecisionController {
    constructor(decisionService) {
        this.decisionService = decisionService;
    }
    async evaluate(dto, tenant) {
        if (!tenant.tenantId) {
            throw new common_1.BadRequestException('tenantId is required — ensure x-tenant-id header is set');
        }
        const result = await this.decisionService.evaluate({
            tenantId: tenant.tenantId,
            moduleId: dto.moduleId,
            productId: dto.productId,
            transactionType: dto.transactionType,
            amountMinor: dto.amountMinor,
            currency: dto.currency,
            country: dto.country,
            metadata: dto.metadata ?? {},
            actorId: null,
            requestedAt: new Date(),
        });
        return commercial_decision_dto_1.CommercialDecisionResponseDto.from(result);
    }
    async findOne(id, tenant) {
        const result = await this.decisionService.findDecision(id, tenant.tenantId);
        if (!result)
            throw new common_1.NotFoundException(`Decision ${id} not found`);
        return commercial_decision_dto_1.CommercialDecisionResponseDto.from(result);
    }
};
exports.CommercialDecisionController = CommercialDecisionController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [commercial_decision_dto_1.CommercialDecisionRequestDto, Object]),
    __metadata("design:returntype", Promise)
], CommercialDecisionController.prototype, "evaluate", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommercialDecisionController.prototype, "findOne", null);
exports.CommercialDecisionController = CommercialDecisionController = __decorate([
    (0, common_1.Controller)({ path: 'commercial/decisions', version: '1' }),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [commercial_decision_service_1.CommercialDecisionService])
], CommercialDecisionController);
//# sourceMappingURL=commercial-decision.controller.js.map