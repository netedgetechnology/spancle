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
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_service_1 = require("../../booking/services/booking.service");
const booking_authorization_service_1 = require("../../booking/services/booking-authorization.service");
const payment_orchestrator_service_1 = require("../services/payment-orchestrator.service");
const payment_dto_1 = require("../dto/payment.dto");
let PaymentController = class PaymentController {
    constructor(orchestrator, bookingService, authzService) {
        this.orchestrator = orchestrator;
        this.bookingService = bookingService;
        this.authzService = authzService;
    }
    async initiate(dto, tenant, actor, req) {
        const booking = await this.bookingService.findOne(dto.bookingId, tenant.tenantId);
        this.authzService.assertOwnerOrStaff(booking, actor, 'payment initiation');
        const ip = req.headers['x-forwarded-for']
            ?? req.socket.remoteAddress
            ?? undefined;
        return this.orchestrator.initiateForBooking({
            tenantId: tenant.tenantId,
            bookingId: dto.bookingId,
            branchId: dto.branchId,
            amountMinor: dto.amountMinor,
            currency: dto.currency,
            customerEmail: dto.customerEmail ?? '',
            customerId: dto.customerId,
            actorId: actor.actorId,
            ipAddress: ip,
        });
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.Post)('initiate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [payment_dto_1.InitiateBookingPaymentDto, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "initiate", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [payment_orchestrator_service_1.PaymentOrchestratorService,
        booking_service_1.BookingService,
        booking_authorization_service_1.BookingAuthorizationService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map