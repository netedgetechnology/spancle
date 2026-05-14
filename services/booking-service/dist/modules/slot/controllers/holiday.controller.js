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
exports.HolidayController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const slot_guard_1 = require("../guards/slot.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const holiday_service_1 = require("../services/holiday.service");
let HolidayController = class HolidayController {
    constructor(holidayService) {
        this.holidayService = holidayService;
    }
    create(dto, tenant) {
        return this.holidayService.create(dto, tenant.tenantId, 'system');
    }
    seedSystem(tenant) {
        return this.holidayService.seedSystemHolidays(tenant.tenantId, 'system');
    }
    findAll(tenant) {
        return this.holidayService.findAll(tenant.tenantId);
    }
    checkDate(date, tenant) {
        return this.holidayService.isHoliday(tenant.tenantId, date);
    }
    findOne(id, tenant) {
        return this.holidayService.findOne(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.holidayService.update(id, dto, tenant.tenantId, 'system');
    }
    remove(id, tenant) {
        return this.holidayService.remove(id, tenant.tenantId, 'system');
    }
};
exports.HolidayController = HolidayController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], HolidayController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('seed-system'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HolidayController.prototype, "seedSystem", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], HolidayController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Query)('date')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HolidayController.prototype, "checkDate", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HolidayController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], HolidayController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], HolidayController.prototype, "remove", null);
exports.HolidayController = HolidayController = __decorate([
    (0, common_1.Controller)('holidays'),
    (0, common_1.UseGuards)(slot_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [holiday_service_1.HolidayService])
], HolidayController);
//# sourceMappingURL=holiday.controller.js.map