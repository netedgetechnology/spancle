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
exports.PaymentAdminController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const payment_service_1 = require("../services/payment.service");
const payment_dto_1 = require("../dto/payment.dto");
let PaymentAdminController = class PaymentAdminController {
    constructor(paymentService) {
        this.paymentService = paymentService;
    }
    initiate(dto, tenant, actor) {
        return this.paymentService.initiate(dto, tenant.tenantId, actor.actorId);
    }
    findAll(tenant, status, customerId, limit = 50, offset = 0) {
        return this.paymentService.findAll(tenant.tenantId, { status, customerId, limit, offset });
    }
    findOne(id, tenant) {
        return this.paymentService.findById(id, tenant.tenantId);
    }
    findAllocations(id, tenant) {
        return this.paymentService.findAllocations(id, tenant.tenantId);
    }
    capture(id, dto, tenant, actor) {
        return this.paymentService.capture(id, dto, tenant.tenantId, actor.actorId);
    }
    fail(id, dto, tenant, actor) {
        return this.paymentService.fail(id, dto, tenant.tenantId, actor.actorId);
    }
    allocate(id, dto, tenant, actor) {
        return this.paymentService.allocate(id, dto, tenant.tenantId, actor.actorId);
    }
    reconcile(id, tenant, actor) {
        return this.paymentService.reconcile(id, tenant.tenantId, actor.actorId);
    }
};
exports.PaymentAdminController = PaymentAdminController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.InitiatePaymentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "initiate", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('customerId')),
    __param(3, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/allocations'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "findAllocations", null);
__decorate([
    (0, common_1.Patch)(':id/capture'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payment_dto_1.CapturePaymentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "capture", null);
__decorate([
    (0, common_1.Patch)(':id/fail'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payment_dto_1.FailPaymentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "fail", null);
__decorate([
    (0, common_1.Patch)(':id/allocate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, payment_dto_1.AllocatePaymentDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "allocate", null);
__decorate([
    (0, common_1.Patch)(':id/reconcile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentAdminController.prototype, "reconcile", null);
exports.PaymentAdminController = PaymentAdminController = __decorate([
    (0, common_1.Controller)('finance/admin/payments'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [payment_service_1.PaymentService])
], PaymentAdminController);
//# sourceMappingURL=payment-admin.controller.js.map