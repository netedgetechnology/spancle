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
exports.PlanController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const super_admin_guard_1 = require("../../admin/guards/super-admin.guard");
const plan_service_1 = require("../services/plan.service");
let PlanController = class PlanController {
    constructor(planService) {
        this.planService = planService;
    }
    getCurrentPlan(tenant) {
        return this.planService.findForTenant(tenant.tenantId);
    }
    getEffectiveLimits(tenant) {
        return this.planService.getEffectiveLimits(tenant.tenantId);
    }
    findOne(id) {
        return this.planService.findOne(id);
    }
    updateOverrides(id, dto) {
        return this.planService.updateOverrides(id, dto, 'system');
    }
};
exports.PlanController = PlanController;
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlanController.prototype, "getCurrentPlan", null);
__decorate([
    (0, common_1.Get)('current/effective-limits'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PlanController.prototype, "getEffectiveLimits", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PlanController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/overrides'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Function]),
    __metadata("design:returntype", void 0)
], PlanController.prototype, "updateOverrides", null);
exports.PlanController = PlanController = __decorate([
    (0, common_1.Controller)('plans'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [plan_service_1.PlanService])
], PlanController);
//# sourceMappingURL=plan.controller.js.map