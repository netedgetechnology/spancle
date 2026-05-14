/**
 * Blackout scope — what level of the hierarchy is blocked:
 *   tenant  → all courts for this tenant
 *   branch  → all courts in a specific branch
 *   court   → a single specific court
 *   sport   → all courts with this sport assigned
 */
export type BlackoutScope = 'tenant' | 'branch' | 'court' | 'sport';
/**
 * BlackoutEntity — a time window that prevents slot generation or booking.
 *
 * Two purposes:
 *   1. Block future slot generation (checked by SlotGeneratorService)
 *   2. Block booking on already-generated slots (checked by BookingService)
 *
 * Examples:
 *   - Christmas closure: scope=tenant, full day, Dec 25
 *   - Court maintenance: scope=court, specific datetime range
 *   - Branch refurbishment: scope=branch, full week
 *   - Tournament reservation: scope=sport, specific courts/dates
 *
 * Cancels existing 'available' slots:
 *   When isActive is set to true, SlotService optionally cancels
 *   all 'available' slots in the window (not 'booked' — those require
 *   manual intervention). Controlled by cancelExistingSlots flag.
 *
 * Table: blackouts
 */
export declare class BlackoutEntity {
    id: string;
    tenantId: string;
    name: string;
    reason: string | null;
    scope: BlackoutScope;
    /** Set when scope = 'branch' */
    branchId: string | null;
    /** Set when scope = 'court' */
    courtId: string | null;
    /** Set when scope = 'sport' */
    sportId: string | null;
    /** Start of the blackout window (inclusive, with timezone) */
    startAt: Date;
    /** End of the blackout window (exclusive) */
    endAt: Date;
    /**
     * If true, the blackout applies to the entire day(s) regardless of time.
     * When true, startAt/endAt times are ignored; only dates matter.
     */
    allDay: boolean;
    /**
     * If true, cancels all 'available' slots within this window when the
     * blackout is created or activated. 'booked' slots are NOT cancelled
     * automatically — those require manual admin review.
     */
    cancelExistingSlots: boolean;
    /**
     * If true, new bookings cannot be made in this window even if slots
     * were not cancelled. Allows existing bookings to remain honoured.
     */
    blockNewBookings: boolean;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=blackout.entity.d.ts.map