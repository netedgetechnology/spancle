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
exports.WaitlistController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const waitlist_service_1 = require("../services/waitlist.service");
const waitlist_dto_1 = require("../dto/waitlist.dto");
let WaitlistController = class WaitlistController {
    constructor(waitlistService) {
        this.waitlistService = waitlistService;
    }
    join(dto, tenant, actor) {
        return this.waitlistService.join(dto, tenant.tenantId, actor.actorId);
    }
    findAll(query, tenant) {
        return this.waitlistService.findAll(tenant.tenantId, query);
    }
    findBySlot(slotId, tenant) {
        return this.waitlistService.findBySlot(slotId, tenant.tenantId);
    }
    findByCustomer(customerId, tenant) {
        return this.waitlistService.findByCustomer(customerId, tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.waitlistService.findOne(id, tenant.tenantId);
    }
    leave(id, tenant) {
        return this.waitlistService.leave(id, tenant.tenantId);
    }
};
exports.WaitlistController = WaitlistController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [waitlist_dto_1.JoinWaitlistDto, Object, Object]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "join", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [waitlist_dto_1.WaitlistQueryDto, Object]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('slot/:slotId'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('slotId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "findBySlot", null);
__decorate([
    (0, common_1.Get)('customer/:customerId'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('customerId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "findByCustomer", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], WaitlistController.prototype, "leave", null);
exports.WaitlistController = WaitlistController = __decorate([
    (0, common_1.Controller)('waitlist'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [waitlist_service_1.WaitlistService])
], WaitlistController);
//# sourceMappingURL=waitlist.controller.js.map