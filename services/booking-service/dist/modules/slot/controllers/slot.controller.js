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
exports.SlotController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const slot_guard_1 = require("../guards/slot.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const slot_service_1 = require("../services/slot.service");
const slot_generator_service_1 = require("../services/slot-generator.service");
const availability_service_1 = require("../services/availability.service");
const create_slot_dto_1 = require("../dto/create-slot.dto");
const update_slot_dto_1 = require("../dto/update-slot.dto");
const generate_slots_dto_1 = require("../dto/generate-slots.dto");
const query_slots_dto_1 = require("../dto/query-slots.dto");
let SlotController = class SlotController {
    constructor(slotService, generatorService, availabilityService) {
        this.slotService = slotService;
        this.generatorService = generatorService;
        this.availabilityService = availabilityService;
    }
    create(dto, tenant) {
        return this.slotService.create(dto, tenant.tenantId, 'system');
    }
    generate(dto, tenant) {
        return this.generatorService.generate(dto, tenant.tenantId, 'system');
    }
    findAll(query, tenant) {
        return this.slotService.findAll(tenant.tenantId, query);
    }
    getStatusSummary(tenant) {
        return this.slotService.getStatusSummary(tenant.tenantId);
    }
    getAvailability(query, tenant) {
        return this.availabilityService.getAvailableSlots({
            tenantId: tenant.tenantId,
            courtId: query.courtId,
            branchId: query.branchId,
            sportId: query.sportId,
            from: query.from ? new Date(query.from) : new Date(),
            to: query.to ? new Date(query.to) : new Date(Date.now() + 7 * 86_400_000),
        });
    }
    findOne(id, tenant) {
        return this.slotService.findOne(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.slotService.update(id, dto, tenant.tenantId, 'system');
    }
    updateStatus(id, status, tenant) {
        return this.slotService.updateStatus(id, status, tenant.tenantId, 'system');
    }
    reserve(id, tenant) {
        return this.slotService.reserve(id, tenant.tenantId, 'system');
    }
    remove(id, tenant) {
        return this.slotService.remove(id, tenant.tenantId, 'system');
    }
};
exports.SlotController = SlotController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_slot_dto_1.CreateSlotDto, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [generate_slots_dto_1.GenerateSlotsDto, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_slots_dto_1.QuerySlotsDto, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('status-summary'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "getStatusSummary", null);
__decorate([
    (0, common_1.Get)('availability'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_slots_dto_1.QuerySlotsDto, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "getAvailability", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_slot_dto_1.UpdateSlotDto, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/reserve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "reserve", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SlotController.prototype, "remove", null);
exports.SlotController = SlotController = __decorate([
    (0, common_1.Controller)('slots'),
    (0, common_1.UseGuards)(slot_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [slot_service_1.SlotService,
        slot_generator_service_1.SlotGeneratorService,
        availability_service_1.AvailabilityService])
], SlotController);
//# sourceMappingURL=slot.controller.js.map