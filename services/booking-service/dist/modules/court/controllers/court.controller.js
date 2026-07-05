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
exports.VenueCourtController = exports.CourtController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const court_service_1 = require("../services/court.service");
const create_court_dto_1 = require("../dto/create-court.dto");
const update_court_dto_1 = require("../dto/update-court.dto");
let CourtController = class CourtController {
    constructor(courtService) {
        this.courtService = courtService;
    }
    create(dto, tenant) {
        return this.courtService.create(dto, tenant.tenantId);
    }
    findAll(tenant) {
        return this.courtService.findAll(tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.courtService.findOne(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.courtService.update(id, dto, tenant.tenantId);
    }
    remove(id, tenant) {
        return this.courtService.remove(id, tenant.tenantId);
    }
};
exports.CourtController = CourtController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_court_dto_1.CreateCourtDto, Object]),
    __metadata("design:returntype", Promise)
], CourtController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CourtController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CourtController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_court_dto_1.UpdateCourtDto, Object]),
    __metadata("design:returntype", Promise)
], CourtController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CourtController.prototype, "remove", null);
exports.CourtController = CourtController = __decorate([
    (0, common_1.Controller)('courts'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [court_service_1.CourtService])
], CourtController);
let VenueCourtController = class VenueCourtController {
    constructor(courtService) {
        this.courtService = courtService;
    }
    findByVenue(venueId, tenant) {
        return this.courtService.findAllByVenue(venueId, tenant.tenantId);
    }
};
exports.VenueCourtController = VenueCourtController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('venueId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VenueCourtController.prototype, "findByVenue", null);
exports.VenueCourtController = VenueCourtController = __decorate([
    (0, common_1.Controller)('venues/:venueId/courts'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [court_service_1.CourtService])
], VenueCourtController);
//# sourceMappingURL=court.controller.js.map