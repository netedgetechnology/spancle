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
exports.FinanceBookingRefundJobAdminController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const finance_booking_refund_job_service_1 = require("../services/finance-booking-refund-job.service");
let FinanceBookingRefundJobAdminController = class FinanceBookingRefundJobAdminController {
    constructor(jobService) {
        this.jobService = jobService;
    }
    findOne(id, tenant) {
        return this.jobService.findById(id, tenant.tenantId);
    }
    findByBookingRefund(bookingRefundId, tenant) {
        return this.jobService.findByBookingRefundId(bookingRefundId, tenant.tenantId);
    }
    retry(id, tenant, _actor) {
        return this.jobService.processJob(id, tenant.tenantId);
    }
};
exports.FinanceBookingRefundJobAdminController = FinanceBookingRefundJobAdminController;
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceBookingRefundJobAdminController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('by-booking-refund/:bookingRefundId'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('bookingRefundId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceBookingRefundJobAdminController.prototype, "findByBookingRefund", null);
__decorate([
    (0, common_1.Post)(':id/retry'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceBookingRefundJobAdminController.prototype, "retry", null);
exports.FinanceBookingRefundJobAdminController = FinanceBookingRefundJobAdminController = __decorate([
    (0, common_1.Controller)('finance/admin/booking-refund-jobs'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [finance_booking_refund_job_service_1.FinanceBookingRefundJobService])
], FinanceBookingRefundJobAdminController);
//# sourceMappingURL=finance-booking-refund-job-admin.controller.js.map