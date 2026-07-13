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
exports.RefundAdminController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const refund_service_1 = require("../services/refund.service");
const refund_dto_1 = require("../dto/refund.dto");
let RefundAdminController = class RefundAdminController {
    constructor(refundService) {
        this.refundService = refundService;
    }
    requestRefund(dto, tenant, actor) {
        return this.refundService.requestRefund(dto, tenant.tenantId, actor.actorId);
    }
    prepare(dto, tenant, actor) {
        return this.refundService.prepareRefund(dto, tenant.tenantId, actor.actorId);
    }
    findAll(tenant, status, limit = 50, offset = 0) {
        return this.refundService.findAll(tenant.tenantId, { status, limit, offset });
    }
    findOne(id, tenant) {
        return this.refundService.findById(id, tenant.tenantId);
    }
    findByInvoice(invoiceId, tenant) {
        return this.refundService.findByInvoice(invoiceId, tenant.tenantId);
    }
    findByPayment(paymentId, tenant) {
        return this.refundService.findByPayment(paymentId, tenant.tenantId);
    }
    complete(id, dto, tenant, actor) {
        return this.refundService.completeRefund(id, dto, tenant.tenantId, actor.actorId);
    }
    reject(id, dto, tenant, actor) {
        return this.refundService.rejectRefund(id, dto, tenant.tenantId, actor.actorId);
    }
};
exports.RefundAdminController = RefundAdminController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refund_dto_1.PrepareRefundDto, Object, Object]),
    __metadata("design:returntype", Promise)
], RefundAdminController.prototype, "requestRefund", null);
__decorate([
    (0, common_1.Post)('prepare'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refund_dto_1.PrepareRefundDto, Object, Object]),
    __metadata("design:returntype", Promise)
], RefundAdminController.prototype, "prepare", null);
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
], RefundAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RefundAdminController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('invoice/:invoiceId'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('invoiceId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RefundAdminController.prototype, "findByInvoice", null);
__decorate([
    (0, common_1.Get)('payment/:paymentId'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('paymentId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], RefundAdminController.prototype, "findByPayment", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, refund_dto_1.CompleteRefundDto, Object, Object]),
    __metadata("design:returntype", Promise)
], RefundAdminController.prototype, "complete", null);
__decorate([
    (0, common_1.Patch)(':id/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, refund_dto_1.RejectRefundDto, Object, Object]),
    __metadata("design:returntype", Promise)
], RefundAdminController.prototype, "reject", null);
exports.RefundAdminController = RefundAdminController = __decorate([
    (0, common_1.Controller)('finance/admin/refunds'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [refund_service_1.RefundService])
], RefundAdminController);
//# sourceMappingURL=refund-admin.controller.js.map