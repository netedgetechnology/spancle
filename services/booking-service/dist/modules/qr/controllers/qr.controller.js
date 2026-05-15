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
exports.QrController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const core_1 = require("@nestjs/core");
const qr_generation_service_1 = require("../services/qr-generation.service");
const qr_validation_service_1 = require("../services/qr-validation.service");
const qr_token_dto_1 = require("../dto/qr-token.dto");
const common_2 = require("@nestjs/common");
let QrController = class QrController {
    constructor(generationService, validationService) {
        this.generationService = generationService;
        this.validationService = validationService;
    }
    issue(dto, tenant, actor) {
        return this.generationService.issue(dto, tenant.tenantId, actor.actorId);
    }
    scan(dto, tenant, actor, req) {
        const scanIp = req.headers['x-forwarded-for']
            ?.split(',')[0]?.trim() ?? req.ip ?? null;
        return this.validationService.scan(dto, tenant.tenantId, actor.actorId, scanIp);
    }
    verify(dto, req) {
        const scanIp = req.headers['x-forwarded-for']
            ?.split(',')[0]?.trim() ?? req.ip ?? null;
        return this.validationService.verify(dto, scanIp);
    }
    revoke(tokenId, dto, tenant, actor) {
        return this.generationService.revoke(tokenId, dto, tenant.tenantId, actor.actorId);
    }
    findOne(tokenId, tenant) {
        return this.generationService.findById(tokenId, tenant.tenantId);
    }
    findByBooking(bookingId, tenant) {
        return this.generationService.findByBooking(bookingId, tenant.tenantId);
    }
    getScanLogs(bookingId, tenant) {
        return this.validationService.getScanLogs(bookingId, tenant.tenantId);
    }
    getDeviceScanLogs(deviceId, tenant, from, to) {
        return this.validationService.getDeviceScanLogs(deviceId, tenant.tenantId, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
    }
};
exports.QrController = QrController;
__decorate([
    (0, common_1.Post)('issue'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, new booking_guard_1.RbacGuard(new core_1.Reflector())),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [qr_token_dto_1.IssueQrTokenDto, Object, Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "issue", null);
__decorate([
    (0, common_1.Post)('scan'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, new booking_guard_1.RbacGuard(new core_1.Reflector())),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __param(3, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [qr_token_dto_1.ScanQrTokenDto, Object, Object, Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "scan", null);
__decorate([
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH', 'RECEPTIONIST'),
    (0, common_1.Post)('verify'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [qr_token_dto_1.VerifyQrTokenDto, Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)(':tokenId/revoke'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, new booking_guard_1.RbacGuard(new core_1.Reflector())),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('tokenId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, qr_token_dto_1.RevokeQrTokenDto, Object, Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "revoke", null);
__decorate([
    (0, common_1.Get)(':tokenId'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, new booking_guard_1.RbacGuard(new core_1.Reflector())),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('tokenId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('booking/:bookingId'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, new booking_guard_1.RbacGuard(new core_1.Reflector())),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('bookingId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "findByBooking", null);
__decorate([
    (0, common_1.Get)('booking/:bookingId/logs'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, new booking_guard_1.RbacGuard(new core_1.Reflector())),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('bookingId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "getScanLogs", null);
__decorate([
    (0, common_1.Get)('device/:deviceId/logs'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, new booking_guard_1.RbacGuard(new core_1.Reflector())),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('deviceId')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", void 0)
], QrController.prototype, "getDeviceScanLogs", null);
exports.QrController = QrController = __decorate([
    (0, common_1.Controller)('qr'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [qr_generation_service_1.QrGenerationService,
        qr_validation_service_1.QrValidationService])
], QrController);
//# sourceMappingURL=qr.controller.js.map