/**
 * RecurrenceRule — defines which days of the week the template applies.
 * A template with all days false generates no slots.
 */
export interface RecurrenceRule {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
}
/**
 * SlotTemplateEntity — a reusable schedule pattern for a court.
 *
 * A template defines WHEN to generate slots, not the slots themselves.
 * SlotGeneratorService.generateFromTemplate() reads the template and
 * creates SlotEntity rows for the requested date range.
 *
 * One template per court is typical, but a court can have multiple
 * templates for different season schedules (summer/winter hours).
 * Only one template should be active (isActive = true) per court at a time;
 * this is enforced at service layer, not DB level, for flexibility.
 *
 * Template fields:
 *   - courtId:          the court this schedule applies to
 *   - validFrom/Until:  date range the template is in effect
 *   - recurrence:       which days of the week to generate slots
 *   - openTime/closeTime: daily window within which slots are created
 *   - durationMins:     duration of each slot (e.g. 60 = 1-hour slots)
 *   - bufferMins:       gap between slots (e.g. 15 for cleaning time)
 *   - maxAdvanceDays:   how far ahead to pre-generate (default: 30)
 *   - autoPublish:      if true, generated slots start as 'available' immediately
 *
 * Table: slot_templates
 */
export declare class SlotTemplateEntity {
    id: string;
    tenantId: string;
    /** FK → courts.id (identity-service) */
    courtId: string;
    /** Denormalised for branch-level queries */
    branchId: string;
    name: string;
    description: string | null;
    /** Date from which this template is effective (date only — no time) */
    validFrom: string;
    /** Date after which this template expires. Null = no end date */
    validUntil: string | null;
    /**
     * Which days of the week to generate slots.
     * Stored as JSONB RecurrenceRule object.
     */
    recurrence: RecurrenceRule;
    /**
     * Opening time for slot generation — HH:MM in 24-hour format.
     * If null, uses the court's operatingHours for the day.
     */
    openTime: string | null;
    /**
     * Closing time for slot generation — HH:MM in 24-hour format.
     * If null, uses the court's operatingHours for the day.
     */
    closeTime: string | null;
    /** Duration of each generated slot in minutes (e.g. 30, 60, 90) */
    durationMins: number;
    /**
     * Buffer gap between slots in minutes (e.g. 15 for changeover/cleaning).
     * Slots do not overlap during this gap — it is not a bookable period.
     */
    bufferMins: number;
    /**
     * How many days ahead to pre-generate slots from today.
     * Scheduler runs daily and generates slots up to this horizon.
     */
    maxAdvanceDays: number;
    /**
     * Maximum concurrent bookings per generated slot.
     * Overrides court.maxBookingsConcurrent for this template.
     * Null = use court default.
     */
    maxBookings: number | null;
    /**
     * If true, generated slots immediately have status = 'available'.
     * If false, slots start as 'unavailable' and must be published manually.
     */
    autoPublish: boolean;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=slot-template.entity.d.ts.map