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
exports.EntitlementController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const entitlement_service_1 = require("../services/entitlement.service");
const entitlement_dto_1 = require("../dto/entitlement.dto");
let EntitlementController = class EntitlementController {
    constructor(entitlementService) {
        this.entitlementService = entitlementService;
    }
    findAll(membershipId, tenant) {
        return this.entitlementService.findAll(membershipId, tenant.tenantId);
    }
    findOne(membershipId, benefitType, tenant) {
        return this.entitlementService.findOne(membershipId, benefitType, tenant.tenantId);
    }
    initialise(membershipId, dto, tenant) {
        return this.entitlementService.initialise(membershipId, tenant.tenantId, dto);
    }
    consume(membershipId, dto, tenant, actor) {
        return this.entitlementService.consume(membershipId, dto, tenant.tenantId, actor.actorId);
    }
    refund(membershipId, dto, tenant, actor) {
        return this.entitlementService.refund(membershipId, dto, tenant.tenantId, actor.actorId);
    }
    adjust(membershipId, dto, tenant, actor) {
        return this.entitlementService.adjust(membershipId, dto, tenant.tenantId, actor.actorId);
    }
    reserve(membershipId, dto, tenant, actor) {
        return this.entitlementService.reserve(membershipId, dto, tenant.tenantId, actor.actorId);
    }
    release(membershipId, dto, tenant, actor) {
        return this.entitlementService.releaseReservation(membershipId, dto, tenant.tenantId, actor.actorId);
    }
};
exports.EntitlementController = EntitlementController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':benefitType'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Param)('benefitType')),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('initialise'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entitlement_dto_1.InitialiseEntitlementDto, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "initialise", null);
__decorate([
    (0, common_1.Post)('consume'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entitlement_dto_1.ConsumeEntitlementDto, Object, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "consume", null);
__decorate([
    (0, common_1.Post)('refund'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entitlement_dto_1.RefundEntitlementDto, Object, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "refund", null);
__decorate([
    (0, common_1.Post)('adjust'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entitlement_dto_1.AdjustEntitlementDto, Object, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "adjust", null);
__decorate([
    (0, common_1.Post)('reserve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entitlement_dto_1.ReserveEntitlementDto, Object, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "reserve", null);
__decorate([
    (0, common_1.Post)('release'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER'),
    __param(0, (0, common_1.Param)('membershipId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, entitlement_dto_1.ReleaseReservedEntitlementDto, Object, Object]),
    __metadata("design:returntype", Promise)
], EntitlementController.prototype, "release", null);
exports.EntitlementController = EntitlementController = __decorate([
    (0, common_1.Controller)('memberships/:membershipId/entitlements'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [entitlement_service_1.EntitlementService])
], EntitlementController);
//# sourceMappingURL=entitlement.controller.js.map