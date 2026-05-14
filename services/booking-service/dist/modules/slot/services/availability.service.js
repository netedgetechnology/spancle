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
/**
 * AvailabilityService — answers "what slots are available?" queries.
 *
 * Responsibilities:
 *   - Query available/booked slots for a court or branch on a date range
 *   - Check whether a specific time window is free (used by BookingService)
 *   - Provide utilisation summaries for the admin calendar
 *   - Filter out blackout windows from availability results
 *
 * This service is read-only — it never mutates slots or blackouts.
 */
let AvailabilityService = AvailabilityService_1 = class AvailabilityService {
    constructor(slotRepository, blackoutRepository) {
        this.slotRepository = slotRepository;
        this.blackoutRepository = blackoutRepository;
        this.logger = new common_1.Logger(AvailabilityService_1.name);
    }
    /**
     * Returns available slots for a court within a date range.
     * Blackout windows are annotated (slots within blackouts are still returned,
     * but hasBlackout flag is set on the day — client-side decision to show/hide).
     */
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
    /**
     * Returns all slots (all statuses) for a court within a range.
     * Used by the admin calendar view.
     */
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
    /**
     * Checks whether a specific time window is free on a court.
     *
     * Returns: { available: boolean, reason?: string }
     * Used by BookingService before confirming a booking.
     *
     * Checks:
     *   1. No overlapping non-cancelled slots
     *   2. No active blackout blocks new bookings in this window
     */
    async isWindowFree(params) {
        // Check overlap
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
        // Check blackout blocks new bookings
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
    /**
     * Court utilisation summary for an admin dashboard widget.
     * Returns slot counts and utilisation percentage.
     */
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