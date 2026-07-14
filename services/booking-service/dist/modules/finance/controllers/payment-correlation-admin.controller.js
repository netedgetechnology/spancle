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
exports.PaymentCorrelationAdminController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const payment_correlation_service_1 = require("../services/payment-correlation.service");
const payment_correlation_dto_1 = require("../dto/payment-correlation.dto");
let PaymentCorrelationAdminController = class PaymentCorrelationAdminController {
    constructor(correlationService) {
        this.correlationService = correlationService;
    }
    create(dto, tenant, actor) {
        return this.correlationService.createMapping(dto, tenant.tenantId, actor.actorId);
    }
    findByBookingPayment(id, tenant) {
        return this.correlationService.findByBookingPaymentId(id, tenant.tenantId);
    }
    findByFinancePayment(id, tenant) {
        return this.correlationService.findByFinancePaymentId(id, tenant.tenantId);
    }
};
exports.PaymentCorrelationAdminController = PaymentCorrelationAdminController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_correlation_dto_1.CreatePaymentCorrelationDto, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentCorrelationAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('by-booking-payment/:id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentCorrelationAdminController.prototype, "findByBookingPayment", null);
__decorate([
    (0, common_1.Get)('by-finance-payment/:id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentCorrelationAdminController.prototype, "findByFinancePayment", null);
exports.PaymentCorrelationAdminController = PaymentCorrelationAdminController = __decorate([
    (0, common_1.Controller)('finance/admin/payment-correlations'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [payment_correlation_service_1.PaymentCorrelationService])
], PaymentCorrelationAdminController);
//# sourceMappingURL=payment-correlation-admin.controller.js.map