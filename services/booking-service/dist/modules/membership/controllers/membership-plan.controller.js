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
exports.MembershipPlanController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const membership_plan_service_1 = require("../services/membership-plan.service");
const create_membership_plan_dto_1 = require("../dto/create-membership-plan.dto");
const update_membership_plan_dto_1 = require("../dto/update-membership-plan.dto");
let MembershipPlanController = class MembershipPlanController {
    constructor(planService) {
        this.planService = planService;
    }
    create(dto, tenant, actor) {
        return this.planService.create(dto, tenant.tenantId, actor.actorId);
    }
    findAll(tenant) {
        return this.planService.findAll(tenant.tenantId);
    }
    findPublic(tenant) {
        return this.planService.findAll(tenant.tenantId, true);
    }
    findOne(id, tenant) {
        return this.planService.findOne(id, tenant.tenantId);
    }
    update(id, dto, tenant, actor) {
        return this.planService.update(id, dto, tenant.tenantId, actor.actorId);
    }
    findBenefits(id, tenant) {
        return this.planService.findBenefits(id, tenant.tenantId);
    }
    addBenefit(id, dto, tenant) {
        return this.planService.addBenefit(id, dto, tenant.tenantId);
    }
    removeBenefit(benefitId, tenant) {
        return this.planService.removeBenefit(benefitId, tenant.tenantId);
    }
    archive(id, tenant, actor) {
        return this.planService.archive(id, tenant.tenantId, actor.actorId);
    }
};
exports.MembershipPlanController = MembershipPlanController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_membership_plan_dto_1.CreateMembershipPlanDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('public'),
    (0, roles_decorator_1.Roles)('PLAYER', 'TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "findPublic", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_membership_plan_dto_1.UpdateMembershipPlanDto, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "update", null);
__decorate([
    (0, common_1.Get)(':id/benefits'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "findBenefits", null);
__decorate([
    (0, common_1.Post)(':id/benefits'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_membership_plan_dto_1.CreateBenefitDto, Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "addBenefit", null);
__decorate([
    (0, common_1.Delete)(':id/benefits/:benefitId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('benefitId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "removeBenefit", null);
__decorate([
    (0, common_1.Patch)(':id/archive'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], MembershipPlanController.prototype, "archive", null);
exports.MembershipPlanController = MembershipPlanController = __decorate([
    (0, common_1.Controller)('membership-plans'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [membership_plan_service_1.MembershipPlanService])
], MembershipPlanController);
//# sourceMappingURL=membership-plan.controller.js.map