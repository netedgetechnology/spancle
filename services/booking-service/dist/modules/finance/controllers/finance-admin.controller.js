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
exports.FinanceAdminController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const accounting_period_service_1 = require("../services/accounting-period.service");
const chart_of_account_service_1 = require("../services/chart-of-account.service");
const class_validator_1 = require("class-validator");
class PeriodParamDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], PeriodParamDto.prototype, "period", void 0);
class ReopenPeriodDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], ReopenPeriodDto.prototype, "note", void 0);
class CloseParamDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CloseParamDto.prototype, "period", void 0);
let FinanceAdminController = class FinanceAdminController {
    constructor(periodService, coaService) {
        this.periodService = periodService;
        this.coaService = coaService;
    }
    listPeriods(tenant) {
        return this.periodService.findAll(tenant.tenantId);
    }
    openPeriod(tenant) {
        return this.periodService.findOpen(tenant.tenantId);
    }
    ensureCurrent(tenant) {
        return this.periodService.ensureCurrentPeriodOpen(tenant.tenantId);
    }
    beginClose(period, tenant, actor) {
        return this.periodService.beginClose(period, tenant.tenantId, actor.actorId);
    }
    confirmClose(period, tenant) {
        return this.periodService.confirmClose(period, tenant.tenantId);
    }
    lock(period, tenant, actor) {
        return this.periodService.lock(period, tenant.tenantId, actor.actorId);
    }
    reopen(period, dto, tenant, actor) {
        return this.periodService.reopen(period, tenant.tenantId, actor.actorId, dto.note);
    }
    listAccounts(tenant) {
        return this.coaService.findAll(tenant.tenantId);
    }
    getAccount(code, tenant) {
        return this.coaService.findByCode(code, tenant.tenantId);
    }
    seedAccounts(tenant) {
        return this.coaService.seedSystemAccounts(tenant.tenantId);
    }
};
exports.FinanceAdminController = FinanceAdminController;
__decorate([
    (0, common_1.Get)('periods'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "listPeriods", null);
__decorate([
    (0, common_1.Get)('periods/open'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "openPeriod", null);
__decorate([
    (0, common_1.Post)('periods/ensure-current'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "ensureCurrent", null);
__decorate([
    (0, common_1.Patch)('periods/:period/begin-close'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('period')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "beginClose", null);
__decorate([
    (0, common_1.Patch)('periods/:period/confirm-close'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('period')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "confirmClose", null);
__decorate([
    (0, common_1.Patch)('periods/:period/lock'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('period')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "lock", null);
__decorate([
    (0, common_1.Patch)('periods/:period/reopen'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('period')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ReopenPeriodDto, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "reopen", null);
__decorate([
    (0, common_1.Get)('accounts'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "listAccounts", null);
__decorate([
    (0, common_1.Get)('accounts/:code'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('code')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "getAccount", null);
__decorate([
    (0, common_1.Post)('accounts/seed'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FinanceAdminController.prototype, "seedAccounts", null);
exports.FinanceAdminController = FinanceAdminController = __decorate([
    (0, common_1.Controller)('finance/admin'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [accounting_period_service_1.AccountingPeriodService,
        chart_of_account_service_1.ChartOfAccountService])
], FinanceAdminController);
//# sourceMappingURL=finance-admin.controller.js.map