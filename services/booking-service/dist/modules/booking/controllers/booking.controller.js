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
exports.BookingController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const booking_guard_1 = require("../guards/booking.guard");
const booking_service_1 = require("../services/booking.service");
const booking_authorization_service_1 = require("../services/booking-authorization.service");
const qr_generation_service_1 = require("../../qr/services/qr-generation.service");
const create_booking_dto_1 = require("../dto/create-booking.dto");
const booking_query_dto_1 = require("../dto/booking-query.dto");
const update_booking_dto_1 = require("../dto/update-booking.dto");
let BookingController = class BookingController {
    constructor(bookingService, authzService, qrGenerationService) {
        this.bookingService = bookingService;
        this.authzService = authzService;
        this.qrGenerationService = qrGenerationService;
    }
    create(dto, tenant, actor) {
        return this.bookingService.create(dto, tenant.tenantId, actor.actorId);
    }
    findAll(query, tenant) {
        return this.bookingService.findAll(query, tenant.tenantId);
    }
    getStatusSummary(tenant) {
        return this.bookingService.getStatusSummary(tenant.tenantId);
    }
    async findByReference(reference, tenant, actor) {
        const booking = await this.bookingService.findByReference(reference, tenant.tenantId);
        this.authzService.assertOwnerOrStaff(booking, actor, 'booking by reference');
        return booking;
    }
    async findOne(id, tenant, actor) {
        const booking = await this.bookingService.findOne(id, tenant.tenantId);
        this.authzService.assertOwnerOrStaff(booking, actor, 'booking');
        return booking;
    }
    reserve(id, tenant, actor) {
        return this.bookingService.reserve(id, tenant.tenantId, actor.actorId);
    }
    expire(id, tenant, actor) {
        return this.bookingService.expire(id, tenant.tenantId, actor.actorId);
    }
    confirm(id, tenant, actor) {
        return this.bookingService.confirm(id, tenant.tenantId, actor.actorId);
    }
    async cancel(id, dto, tenant, actor) {
        const booking = await this.bookingService.findOne(id, tenant.tenantId);
        this.authzService.assertOwnerOrStaff(booking, actor, 'cancellation');
        return this.bookingService.cancel(id, dto, tenant.tenantId, actor.actorId, actor.role);
    }
    reschedule(id, dto, tenant, actor) {
        return this.bookingService.reschedule(id, dto, tenant.tenantId, actor.actorId);
    }
    checkIn(id, dto, tenant, actor) {
        return this.bookingService.checkIn(id, dto, tenant.tenantId, actor.actorId);
    }
    markNoShow(id, dto, tenant, actor) {
        return this.bookingService.markNoShow(id, dto, tenant.tenantId, actor.actorId);
    }
    waiveNoShow(id, dto, tenant, actor) {
        return this.bookingService.waiveNoShow(id, dto, tenant.tenantId, actor.actorId);
    }
    async paymentFailed(id, dto, tenant, actor) {
        const booking = await this.bookingService.findOne(id, tenant.tenantId);
        this.authzService.assertOwnerOrStaff(booking, actor, 'payment-failed');
        return this.bookingService.paymentFailed(id, dto, tenant.tenantId, actor.actorId);
    }
    markInProgress(id, tenant, actor) {
        return this.bookingService.markInProgress(id, tenant.tenantId, actor.actorId);
    }
    complete(id, tenant, actor) {
        return this.bookingService.complete(id, tenant.tenantId, actor.actorId);
    }
    async remove(id, tenant, actor) {
        const booking = await this.bookingService.findOne(id, tenant.tenantId);
        if (booking.status === 'confirmed' || booking.status === 'pending_payment') {
            await this.bookingService.cancel(id, { reason: 'Deleted by admin', cancelledById: actor.actorId }, tenant.tenantId, actor.actorId);
        }
    }
    processRefund(id, dto, tenant, actor) {
        return this.bookingService.processRefund(id, dto, tenant.tenantId, actor.actorId);
    }
    async getConsumerQr(bookingId, tenant, actor) {
        const booking = await this.bookingService.findOne(bookingId, tenant.tenantId);
        this.authzService.assertOwnerOrStaff(booking, actor, 'QR code');
        return this.qrGenerationService.issue({ bookingId }, tenant.tenantId, actor.actorId);
    }
};
exports.BookingController = BookingController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'PLAYER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_booking_dto_1.CreateBookingDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [booking_query_dto_1.BookingQueryDto, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('status-summary'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "getStatusSummary", null);
__decorate([
    (0, common_1.Get)('by-reference/:reference'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'PLAYER'),
    __param(0, (0, common_1.Param)('reference')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "findByReference", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id/reserve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "reserve", null);
__decorate([
    (0, common_1.Patch)(':id/expire'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "expire", null);
__decorate([
    (0, common_1.Patch)(':id/confirm'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "confirm", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_dto_1.CancelBookingDto, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/reschedule'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_dto_1.RescheduleBookingDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "reschedule", null);
__decorate([
    (0, common_1.Patch)(':id/check-in'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_dto_1.CheckInDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Patch)(':id/no-show'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_dto_1.MarkNoShowDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "markNoShow", null);
__decorate([
    (0, common_1.Patch)(':id/no-show/waive'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_dto_1.WaiveNoShowDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "waiveNoShow", null);
__decorate([
    (0, common_1.Patch)(':id/payment-failed'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Function, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "paymentFailed", null);
__decorate([
    (0, common_1.Patch)(':id/mark-in-progress'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "markInProgress", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "complete", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/refunds'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_dto_1.ProcessBookingRefundDto, Object, Object]),
    __metadata("design:returntype", void 0)
], BookingController.prototype, "processRefund", null);
__decorate([
    (0, common_1.Get)(':bookingId/qr'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, roles_decorator_1.Roles)('PLAYER'),
    __param(0, (0, common_1.Param)('bookingId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], BookingController.prototype, "getConsumerQr", null);
exports.BookingController = BookingController = __decorate([
    (0, common_1.Controller)('bookings'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [booking_service_1.BookingService,
        booking_authorization_service_1.BookingAuthorizationService,
        qr_generation_service_1.QrGenerationService])
], BookingController);
//# sourceMappingURL=booking.controller.js.map