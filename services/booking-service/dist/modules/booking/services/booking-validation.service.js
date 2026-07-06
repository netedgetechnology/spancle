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
var BookingValidationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingValidationService = void 0;
const common_1 = require("@nestjs/common");
const slot_repository_1 = require("../../slot/repositories/slot.repository");
const booking_repository_1 = require("../repositories/booking.repository");
const court_service_1 = require("../../court/services/court.service");
const venue_service_1 = require("../../venue/services/venue.service");
let BookingValidationService = BookingValidationService_1 = class BookingValidationService {
    constructor(slotRepository, bookingRepository, courtService, venueService) {
        this.slotRepository = slotRepository;
        this.bookingRepository = bookingRepository;
        this.courtService = courtService;
        this.venueService = venueService;
        this.logger = new common_1.Logger(BookingValidationService_1.name);
    }
    async validateCourtAndVenue(courtId, tenantId) {
        const court = await this.courtService.findOne(courtId, tenantId);
        if (!court.isActive) {
            throw new common_1.UnprocessableEntityException(`Court ${courtId} is inactive and cannot accept new bookings`);
        }
        if (!court.isBookable) {
            throw new common_1.UnprocessableEntityException(`Court ${courtId} is not accepting bookings`);
        }
        await this.venueService.findOne(court.venueId, tenantId);
    }
    async validateSlotsForBooking(slotIds, tenantId, courtId) {
        if (slotIds.length === 0) {
            throw new common_1.BadRequestException('At least one slotId is required');
        }
        if (slotIds.length > 20) {
            throw new common_1.BadRequestException('Cannot book more than 20 slots at once');
        }
        const slots = [];
        for (const slotId of slotIds) {
            const slot = await this.slotRepository.findById(slotId, tenantId);
            if (!slot) {
                throw new common_1.UnprocessableEntityException(`Slot ${slotId} not found in this organisation`);
            }
            if (slot.courtId !== courtId) {
                throw new common_1.UnprocessableEntityException(`Slot ${slotId} does not belong to court ${courtId}`);
            }
            if (slot.status !== 'available' && slot.status !== 'reserved') {
                throw new common_1.UnprocessableEntityException(`Slot ${slotId} is not available for booking (status: ${slot.status})`);
            }
            if (slot.currentBookings >= slot.maxBookings) {
                throw new common_1.UnprocessableEntityException(`Slot ${slotId} is fully booked (${slot.currentBookings}/${slot.maxBookings})`);
            }
            slots.push({
                id: slot.id,
                courtId: slot.courtId,
                branchId: slot.branchId,
                startAt: slot.startAt,
                endAt: slot.endAt,
                durationMins: slot.durationMins,
                status: slot.status,
                maxBookings: slot.maxBookings,
                currentBookings: slot.currentBookings,
                resolvedPriceMinor: slot.resolvedPriceMinor,
                priceOverrideMinor: slot.priceOverrideMinor,
                effectivePriceMinor: slot.priceOverrideMinor ?? slot.resolvedPriceMinor,
                currency: slot.currency,
            });
        }
        this.assertNoInternalOverlap(slots);
        await this.assertNoConfirmedOverlap(slots, tenantId);
        return slots;
    }
    async validateSlotsForReschedule(newSlotIds, currentSlotIds, tenantId, courtId, existingBookingId) {
        const overlap = newSlotIds.filter((id) => currentSlotIds.includes(id));
        if (overlap.length > 0) {
            throw new common_1.BadRequestException('New slots must differ from current slots. ' +
                `${overlap.length} slot(s) are unchanged.`);
        }
        const slots = await this.validateSlotsForBooking(newSlotIds, tenantId, courtId);
        for (const slot of slots) {
            const conflicts = await this.bookingRepository.findConfirmedOverlapping({
                tenantId,
                courtId: slot.courtId,
                startsAt: slot.startAt,
                endsAt: slot.endAt,
                excludeId: existingBookingId,
            });
            if (conflicts.length > 0) {
                throw new common_1.UnprocessableEntityException(`New slot ${slot.id} overlaps with booking ${conflicts[0].reference}`);
            }
        }
        return slots;
    }
    assertCancellable(booking) {
        const cancellable = ['reserved', 'pending_payment', 'confirmed'];
        if (!cancellable.includes(booking.status)) {
            throw new common_1.BadRequestException(`Booking cannot be cancelled — current status: ${booking.status}`);
        }
    }
    assertPaymentFailable(booking) {
        if (booking.status !== 'pending_payment') {
            throw new common_1.BadRequestException(`Payment failure can only be recorded on pending_payment bookings — status: ${booking.status}`);
        }
    }
    assertReschedulable(booking) {
        const reschedulable = ['confirmed', 'checked_in'];
        if (!reschedulable.includes(booking.status)) {
            throw new common_1.BadRequestException(`Only confirmed or checked-in bookings can be rescheduled — current status: ${booking.status}`);
        }
        if (booking.startsAt <= new Date()) {
            throw new common_1.BadRequestException('Cannot reschedule a booking that has already started');
        }
    }
    assertCheckInAllowed(booking) {
        if (booking.status !== 'confirmed') {
            throw new common_1.BadRequestException(`Check-in only allowed for confirmed bookings — current status: ${booking.status}`);
        }
        if (booking.checkedInAt) {
            throw new common_1.BadRequestException('Booking has already been checked in');
        }
        const now = Date.now();
        const startsAt = booking.startsAt.getTime();
        const windowOpen = startsAt - 30 * 60_000;
        const windowClose = startsAt + 60 * 60_000;
        if (now < windowOpen) {
            throw new common_1.BadRequestException('Check-in is not yet open — available from 30 minutes before start time');
        }
        if (now > windowClose) {
            throw new common_1.BadRequestException('Check-in window has closed — booking will be marked as no-show');
        }
    }
    assertNoShowMarkable(booking, gracePeriodMins = 30) {
        if (booking.status !== 'confirmed') {
            throw new common_1.BadRequestException(`No-show can only be marked on confirmed bookings — status: ${booking.status}`);
        }
        const cutoff = new Date(booking.startsAt.getTime() + gracePeriodMins * 60_000);
        if (new Date() < cutoff) {
            throw new common_1.BadRequestException(`No-show cannot be marked until ${gracePeriodMins} minutes after start time`);
        }
    }
    assertNoInternalOverlap(slots) {
        const sorted = [...slots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        for (let i = 0; i < sorted.length - 1; i++) {
            const a = sorted[i];
            const b = sorted[i + 1];
            if (a.endAt > b.startAt) {
                throw new common_1.UnprocessableEntityException(`Slots ${a.id} and ${b.id} overlap — cannot book overlapping slots`);
            }
        }
    }
    async assertNoConfirmedOverlap(slots, tenantId) {
        for (const slot of slots) {
            const overlapping = await this.slotRepository.countOverlapping({
                tenantId,
                courtId: slot.courtId,
                startAt: slot.startAt,
                endAt: slot.endAt,
                excludeId: slot.id,
            });
            if (overlapping > 0) {
                throw new common_1.UnprocessableEntityException(`Slot at ${slot.startAt.toISOString()} overlaps with an existing booking on court ${slot.courtId}`);
            }
        }
    }
};
exports.BookingValidationService = BookingValidationService;
exports.BookingValidationService = BookingValidationService = BookingValidationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [slot_repository_1.SlotRepository,
        booking_repository_1.BookingRepository,
        court_service_1.CourtService,
        venue_service_1.VenueService])
], BookingValidationService);
//# sourceMappingURL=booking-validation.service.js.map