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
var AvailabilityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const slot_repository_1 = require("../repositories/slot.repository");
const blackout_repository_1 = require("../repositories/blackout.repository");
let AvailabilityService = AvailabilityService_1 = class AvailabilityService {
    constructor(slotRepository, blackoutRepository) {
        this.slotRepository = slotRepository;
        this.blackoutRepository = blackoutRepository;
        this.logger = new common_1.Logger(AvailabilityService_1.name);
    }
    async getAvailableSlots(params) {
        return this.slotRepository.query({
            tenantId: params.tenantId,
            courtId: params.courtId,
            branchId: params.branchId,
            sportId: params.sportId,
            from: params.from,
            to: params.to,
            status: 'available',
        });
    }
    async getAllSlots(params) {
        return this.slotRepository.query({
            tenantId: params.tenantId,
            courtId: params.courtId,
            branchId: params.branchId,
            sportId: params.sportId,
            from: params.from,
            to: params.to,
        });
    }
    async isWindowFree(params) {
        const overlapCount = await this.slotRepository.countOverlapping({
            tenantId: params.tenantId,
            courtId: params.courtId,
            startAt: params.startAt,
            endAt: params.endAt,
            excludeId: params.excludeSlotId,
        });
        if (overlapCount > 0) {
            return { available: false, reason: 'overlap' };
        }
        const isBlocked = await this.blackoutRepository.isBlocked({
            tenantId: params.tenantId,
            courtId: params.courtId,
            branchId: params.branchId,
            sportId: params.sportId,
            startAt: params.startAt,
            endAt: params.endAt,
        });
        if (isBlocked) {
            return { available: false, reason: 'blackout' };
        }
        return { available: true };
    }
    async getCourtSummary(params) {
        const allSlots = await this.slotRepository.query({
            tenantId: params.tenantId,
            courtId: params.courtId,
            branchId: params.branchId,
            from: params.from,
            to: params.to,
        });
        const counts = {
            available: 0,
            booked: 0,
            reserved: 0,
            unavailable: 0,
            cancelled: 0,
            completed: 0,
        };
        for (const slot of allSlots) {
            counts[slot.status] = (counts[slot.status] ?? 0) + 1;
        }
        const bookable = counts.available + counts.booked + counts.reserved;
        const utilisation = bookable > 0
            ? Math.round(((counts.booked + counts.completed) / bookable) * 100)
            : 0;
        return {
            courtId: params.courtId,
            totalSlots: allSlots.length,
            availableSlots: counts.available,
            bookedSlots: counts.booked,
            reservedSlots: counts.reserved,
            unavailableSlots: counts.unavailable,
            utilizationPct: utilisation,
        };
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = AvailabilityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [slot_repository_1.SlotRepository,
        blackout_repository_1.BlackoutRepository])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map