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
exports.DisputeAdminController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const dispute_service_1 = require("../services/dispute.service");
const dispute_dto_1 = require("../dto/dispute.dto");
let DisputeAdminController = class DisputeAdminController {
    constructor(disputeService) {
        this.disputeService = disputeService;
    }
    open(dto, tenant, actor) {
        return this.disputeService.openDispute(dto, tenant.tenantId, actor.actorId);
    }
    findAll(tenant, status, limit = 50, offset = 0) {
        return this.disputeService.findAll(tenant.tenantId, { status, limit, offset });
    }
    findOne(id, tenant) {
        return this.disputeService.findById(id, tenant.tenantId);
    }
    findByPayment(paymentId, tenant) {
        return this.disputeService.findByPayment(paymentId, tenant.tenantId);
    }
    markUnderReview(id, tenant, actor) {
        return this.disputeService.markUnderReview(id, tenant.tenantId, actor.actorId);
    }
    resolveWon(id, dto, tenant, actor) {
        return this.disputeService.resolveWon(id, dto, tenant.tenantId, actor.actorId);
    }
    resolveLost(id, dto, tenant, actor) {
        return this.disputeService.resolveLost(id, dto, tenant.tenantId, actor.actorId);
    }
    cancel(id, dto, tenant, actor) {
        return this.disputeService.cancelDispute(id, dto, tenant.tenantId, actor.actorId);
    }
};
exports.DisputeAdminController = DisputeAdminController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dispute_dto_1.OpenDisputeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "open", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('payment/:paymentId'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('paymentId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "findByPayment", null);
__decorate([
    (0, common_1.Patch)(':id/under-review'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "markUnderReview", null);
__decorate([
    (0, common_1.Patch)(':id/resolve-won'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dispute_dto_1.ResolveDisputeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "resolveWon", null);
__decorate([
    (0, common_1.Patch)(':id/resolve-lost'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dispute_dto_1.ResolveDisputeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "resolveLost", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dispute_dto_1.CancelDisputeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], DisputeAdminController.prototype, "cancel", null);
exports.DisputeAdminController = DisputeAdminController = __decorate([
    (0, common_1.Controller)('finance/admin/disputes'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [dispute_service_1.DisputeService])
], DisputeAdminController);
//# sourceMappingURL=dispute-admin.controller.js.map