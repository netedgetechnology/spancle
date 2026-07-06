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
exports.VenueSlotController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const availability_service_1 = require("../services/availability.service");
const slot_utils_1 = require("../utils/slot.utils");
class VenueCalendarQueryDto {
}
let VenueSlotController = class VenueSlotController {
    constructor(availabilityService) {
        this.availabilityService = availabilityService;
    }
    getVenueCalendar(venueId, query, tenant) {
        const today = slot_utils_1.SlotUtils.todayUtc();
        const from = query.from ? new Date(query.from) : new Date(`${today}T00:00:00.000Z`);
        const to = query.to ? new Date(query.to) : new Date(`${today}T23:59:59.999Z`);
        return this.availabilityService.getVenueCalendar({
            tenantId: tenant.tenantId,
            venueId,
            from,
            to,
        });
    }
};
exports.VenueSlotController = VenueSlotController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('venueId', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, VenueCalendarQueryDto, Object]),
    __metadata("design:returntype", Promise)
], VenueSlotController.prototype, "getVenueCalendar", null);
exports.VenueSlotController = VenueSlotController = __decorate([
    (0, common_1.Controller)('venues/:venueId/slots'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [availability_service_1.AvailabilityService])
], VenueSlotController);
//# sourceMappingURL=venue-slot.controller.js.map