import { SlotRepository } from '../../slot/repositories/slot.repository';
import { BookingRepository } from '../repositories/booking.repository';
import type { BookingEntity } from '../entities/booking.entity';
export interface SlotInfo {
    id: string;
    courtId: string;
    branchId: string;
    startAt: Date;
    endAt: Date;
    durationMins: number;
    status: string;
    maxBookings: number;
    currentBookings: number;
    resolvedPriceMinor: number | null;
    currency: string;
}
export declare class BookingValidationService {
    private readonly slotRepository;
    private readonly bookingRepository;
    private readonly logger;
    constructor(slotRepository: SlotRepository, bookingRepository: BookingRepository);
    /**
     * Validates all slots for a new booking:
     *   1. Each slot exists and belongs to tenant
     *   2. All slots are 'available' or 'reserved'
     *   3. All slots belong to the same court
     *   4. No slot overlap with existing confirmed bookings (DB-level guard)
     *   5. Booking capacity not exceeded
     *
     * Returns enriched slot data for use in booking creation.
     */
    validateSlotsForBooking(slotIds: string[], tenantId: string, courtId: string): Promise<SlotInfo[]>;
    /**
     * Validates slots for a reschedule operation.
     * Additional check: new slots must not be the same as current slots.
     */
    validateSlotsForReschedule(newSlotIds: string[], currentSlotIds: string[], tenantId: string, courtId: string, existingBookingId: string): Promise<SlotInfo[]>;
    /**
     * Validates that a booking can be cancelled.
     * Rules:
     *   - Only pending_payment and confirmed bookings can be cancelled
     *   - Already completed/refunded/cancelled: reject
     */
    assertCancellable(booking: BookingEntity): void;
    /**
     * Validates that a payment-failure can be recorded.
     * Only pending_payment bookings can be failed.
     */
    assertPaymentFailable(booking: BookingEntity): void;
    /**
     * Validates that a booking can be rescheduled.
     * Only 'confirmed' bookings can be rescheduled.
     */
    assertReschedulable(booking: BookingEntity): void;
    /**
     * Validates that a check-in is valid.
     * Booking must be confirmed and within the check-in window
     * (30 min before to 60 min after start time).
     */
    assertCheckInAllowed(booking: BookingEntity): void;
    /**
     * Validates that a no-show can be marked.
     * Booking must be confirmed and start time must have passed.
     */
    assertNoShowMarkable(booking: BookingEntity, gracePeriodMins?: number): void;
    private assertNoInternalOverlap;
    private assertNoConfirmedOverlap;
}
//# sourceMappingURL=booking-validation.service.d.ts.map