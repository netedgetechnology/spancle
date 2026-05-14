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
exports.BlackoutController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const blackout_repository_1 = require("../repositories/blackout.repository");
const slot_repository_1 = require("../repositories/slot.repository");
const create_blackout_dto_1 = require("../dto/create-blackout.dto");
let BlackoutController = class BlackoutController {
    constructor(blackoutRepository, slotRepository) {
        this.blackoutRepository = blackoutRepository;
        this.slotRepository = slotRepository;
    }
    async create(dto, tenant) {
        const blackout = await this.blackoutRepository.create({
            ...dto,
            tenantId: tenant.tenantId,
            scope: dto.scope ?? 'tenant',
            allDay: dto.allDay ?? false,
            cancelExistingSlots: dto.cancelExistingSlots ?? false,
            blockNewBookings: dto.blockNewBookings ?? true,
            isActive: true,
            isDeleted: false,
            startAt: new Date(dto.startAt),
            endAt: new Date(dto.endAt),
        });
        // Cancel existing available slots if flag is set
        if (dto.cancelExistingSlots) {
            await this.slotRepository.bulkCancelAvailable({
                tenantId: tenant.tenantId,
                startAt: new Date(dto.startAt),
                endAt: new Date(dto.endAt),
                courtId: dto.courtId,
                branchId: dto.branchId,
            });
        }
        return blackout;
    }
    findAll(tenant) {
        return this.blackoutRepository.findAll(tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.blackoutRepository.findByIdOrFail(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.blackoutRepository.updateById(id, tenant.tenantId, dto);
    }
    remove(id, tenant) {
        return this.blackoutRepository.softDelete(id, tenant.tenantId);
    }
};
exports.BlackoutController = BlackoutController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_blackout_dto_1.CreateBlackoutDto, Object]),
    __metadata("design:returntype", Promise)
], BlackoutController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], BlackoutController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlackoutController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], BlackoutController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BlackoutController.prototype, "remove", null);
exports.BlackoutController = BlackoutController = __decorate([
    (0, common_1.Controller)('blackouts'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [blackout_repository_1.BlackoutRepository,
        slot_repository_1.SlotRepository])
], BlackoutController);
//# sourceMappingURL=blackout.controller.js.map