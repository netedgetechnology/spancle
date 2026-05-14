import { SlotRepository } from '../repositories/slot.repository';
import { BlackoutRepository } from '../repositories/blackout.repository';
import type { SlotEntity } from '../entities/slot.entity';
export interface AvailabilityWindow {
    courtId: string;
    branchId: string;
    date: string;
    slots: SlotEntity[];
    hasBlackout: boolean;
}
export interface CourtAvailabilitySummary {
    courtId: string;
    totalSlots: number;
    availableSlots: number;
    bookedSlots: number;
    reservedSlots: number;
    unavailableSlots: number;
    utilizationPct: number;
}
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
export declare class AvailabilityService {
    private readonly slotRepository;
    private readonly blackoutRepository;
    private readonly logger;
    constructor(slotRepository: SlotRepository, blackoutRepository: BlackoutRepository);
    /**
     * Returns available slots for a court within a date range.
     * Blackout windows are annotated (slots within blackouts are still returned,
     * but hasBlackout flag is set on the day — client-side decision to show/hide).
     */
    getAvailableSlots(params: {
        tenantId: string;
        courtId: string;
        branchId: string;
        sportId?: string;
        from: Date;
        to: Date;
    }): Promise<SlotEntity[]>;
    /**
     * Returns all slots (all statuses) for a court within a range.
     * Used by the admin calendar view.
     */
    getAllSlots(params: {
        tenantId: string;
        courtId?: string;
        branchId?: string;
        sportId?: string;
        from: Date;
        to: Date;
    }): Promise<SlotEntity[]>;
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
    isWindowFree(params: {
        tenantId: string;
        courtId: string;
        branchId: string;
        sportId?: string;
        startAt: Date;
        endAt: Date;
        excludeSlotId?: string;
    }): Promise<{
        available: boolean;
        reason?: string;
    }>;
    /**
     * Court utilisation summary for an admin dashboard widget.
     * Returns slot counts and utilisation percentage.
     */
    getCourtSummary(params: {
        tenantId: string;
        courtId: string;
        branchId: string;
        from: Date;
        to: Date;
    }): Promise<CourtAvailabilitySummary>;
}
//# sourceMappingURL=availability.service.d.ts.map