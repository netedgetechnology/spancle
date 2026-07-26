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
exports.BookingRulesController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const booking_rules_service_1 = require("../services/booking-rules.service");
const booking_rules_dto_1 = require("../dto/booking-rules.dto");
let BookingRulesController = class BookingRulesController {
    constructor(rulesService) {
        this.rulesService = rulesService;
    }
    create(dto, tenant) {
        return this.rulesService.create(dto, tenant.tenantId);
    }
    findAll(tenant) {
        return this.rulesService.findAll(tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.rulesService.findOne(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.rulesService.update(id, dto, tenant.tenantId);
    }
    remove(id, tenant) {
        return this.rulesService.remove(id, tenant.tenantId);
    }
};
exports.BookingRulesController = BookingRulesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [booking_rules_dto_1.CreateBookingRulesDto, Object]),
    __metadata("design:returntype", void 0)
], BookingRulesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BookingRulesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingRulesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, booking_rules_dto_1.UpdateBookingRulesDto, Object]),
    __metadata("design:returntype", void 0)
], BookingRulesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingRulesController.prototype, "remove", null);
exports.BookingRulesController = BookingRulesController = __decorate([
    (0, common_1.Controller)('booking-rules'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [booking_rules_service_1.BookingRulesService])
], BookingRulesController);
//# sourceMappingURL=booking-rules.controller.js.map