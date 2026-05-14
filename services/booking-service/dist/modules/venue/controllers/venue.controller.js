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
exports.VenueController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const venue_guard_1 = require("../../venue/guards/venue.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const venue_service_1 = require("../services/venue.service");
const create_venue_dto_1 = require("../dto/create-venue.dto");
const update_venue_dto_1 = require("../dto/update-venue.dto");
let VenueController = class VenueController {
    constructor(venueService) {
        this.venueService = venueService;
    }
    create(dto, tenant) {
        return this.venueService.create(dto, tenant.tenantId);
    }
    findAll(tenant) {
        return this.venueService.findAll(tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.venueService.findOne(id, tenant.tenantId);
    }
    update(id, dto, tenant) {
        return this.venueService.update(id, dto, tenant.tenantId);
    }
    remove(id, tenant) {
        return this.venueService.remove(id, tenant.tenantId);
    }
};
exports.VenueController = VenueController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_venue_dto_1.CreateVenueDto, Object]),
    __metadata("design:returntype", Promise)
], VenueController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VenueController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VenueController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_venue_dto_1.UpdateVenueDto, Object]),
    __metadata("design:returntype", Promise)
], VenueController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VenueController.prototype, "remove", null);
exports.VenueController = VenueController = __decorate([
    (0, common_1.Controller)('venues'),
    (0, common_1.UseGuards)(venue_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [venue_service_1.VenueService])
], VenueController);
//# sourceMappingURL=venue.controller.js.map