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
exports.MembershipController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const membership_service_1 = require("../services/membership.service");
const create_membership_dto_1 = require("../dto/create-membership.dto");
const update_membership_dto_1 = require("../dto/update-membership.dto");
let MembershipController = class MembershipController {
    constructor(membershipService) {
        this.membershipService = membershipService;
    }
    enrol(dto, tenant, actor) {
        return this.membershipService.enrol(dto, tenant.tenantId, actor.actorId);
    }
    findAll(tenant, userId, planId, status, limit = 50, offset = 0) {
        return this.membershipService.findAll(tenant.tenantId, {
            userId, planId, status, limit, offset,
        });
    }
    meStatus(tenant, actor) {
        return this.membershipService.getMembershipStatus(actor.actorId, tenant.tenantId);
    }
    me(tenant, actor) {
        return this.membershipService.findActiveByUser(actor.actorId, tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.membershipService.findOne(id, tenant.tenantId);
    }
    transactions(id, tenant, limit = 50, offset = 0) {
        return this.membershipService.findTransactions(id, tenant.tenantId, limit, offset);
    }
    update(id, dto, tenant, actor) {
        return this.membershipService.update(id, dto, tenant.tenantId, actor.actorId);
    }
    activate(id, tenant, actor) {
        return this.membershipService.activate(id, tenant.tenantId, actor.actorId);
    }
    freeze(id, dto, tenant, actor) {
        return this.membershipService.freeze(id, dto, tenant.tenantId, actor.actorId);
    }
    unfreeze(id, tenant, actor) {
        return this.membershipService.unfreeze(id, tenant.tenantId, actor.actorId);
    }
    cancel(id, dto, tenant, actor) {
        return this.membershipService.cancel(id, dto, tenant.tenantId, actor.actorId);
    }
    suspend(id, tenant, actor) {
        return this.membershipService.suspend(id, tenant.tenantId, actor.actorId);
    }
    restore(id, tenant, actor) {
        return this.membershipService.restore(id, tenant.tenantId, actor.actorId);
    }
    scheduleDowngrade(id, dto, tenant, actor) {
        return this.membershipService.scheduleDowngrade(id, dto, tenant.tenantId, actor.actorId);
    }
    upgrade(id, dto, tenant, actor) {
        return this.membershipService.upgrade(id, dto, tenant.tenantId, actor.actorId);
    }
    expire(id, tenant, actor) {
        return this.membershipService.expire(id, tenant.tenantId, actor.actorId, 'staff');
    }
    renew(id, tenant, actor) {
        return this.membershipService.renew(id, tenant.tenantId, actor.actorId, 'staff');
    }
    assignUser(id, dto, tenant, actor) {
        return this.membershipService.assignUser(id, dto, tenant.tenantId, actor.actorId);
    }
};
exports.MembershipController = MembershipController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_membership_dto_1.CreateMembershipDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "enrol", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('userId')),
    __param(2, (0, common_1.Query)('planId')),
    __param(3, (0, common_1.Query)('status')),
    __param(4, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(5, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('me/status'),
    (0, roles_decorator_1.Roles)('PLAYER', 'TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "meStatus", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, roles_decorator_1.Roles)('PLAYER', 'TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "me", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)(':id/transactions'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "transactions", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_membership_dto_1.UpdateMembershipDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/freeze'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_membership_dto_1.FreezeMembershipDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "freeze", null);
__decorate([
    (0, common_1.Patch)(':id/unfreeze'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "unfreeze", null);
__decorate([
    (0, common_1.Patch)(':id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_membership_dto_1.CancelMembershipDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/suspend'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "suspend", null);
__decorate([
    (0, common_1.Patch)(':id/restore'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "restore", null);
__decorate([
    (0, common_1.Patch)(':id/schedule-downgrade'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_membership_dto_1.ScheduleDowngradeDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "scheduleDowngrade", null);
__decorate([
    (0, common_1.Patch)(':id/upgrade'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_membership_dto_1.UpgradeMembershipDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "upgrade", null);
__decorate([
    (0, common_1.Patch)(':id/expire'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "expire", null);
__decorate([
    (0, common_1.Patch)(':id/renew'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "renew", null);
__decorate([
    (0, common_1.Patch)(':id/assign-user'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_membership_dto_1.AssignUserDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipController.prototype, "assignUser", null);
exports.MembershipController = MembershipController = __decorate([
    (0, common_1.Controller)('memberships'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [membership_service_1.MembershipService])
], MembershipController);
//# sourceMappingURL=membership.controller.js.map