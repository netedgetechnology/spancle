/**
 * GenerateSlotsDto — input for bulk slot generation.
 *
 * Two modes:
 *   1. templateId provided → generate from a SlotTemplate's configuration
 *   2. No templateId       → use the fields directly (ad-hoc generation)
 *
 * In both modes, startDate/endDate defines the date range to generate.
 */
export declare class GenerateSlotsDto {
    courtId: string;
    /** ISO date string (YYYY-MM-DD) — generation starts from this date (inclusive) */
    startDate: string;
    /** ISO date string (YYYY-MM-DD) — generation ends on this date (inclusive, max 90d ahead) */
    endDate: string;
    /** If provided, uses SlotTemplate configuration instead of the fields below */
    templateId?: string;
    /**
     * Duration of each slot in minutes.
     * Must be a multiple of 15 (e.g. 30, 45, 60, 90, 120).
     */
    durationMins?: number;
    /** Gap between slots in minutes (cleaning / changeover time) */
    bufferMins?: number;
    /**
     * Override the court's operating hours for this generation run.
     * Format: { openTime: 'HH:MM', closeTime: 'HH:MM' }
     * If not provided, court/branch hours are used.
     */
    hoursOverride?: {
        openTime: string;
        closeTime: string;
    };
    /** If false, generated slots start as 'unavailable' (require manual publishing) */
    autoPublish?: boolean;
    /** Skip generation on dates matching active holidays */
    skipHolidays?: boolean;
    /** Skip generation on dates with active blackouts for this court/branch/tenant */
    skipBlackouts?: boolean;
}
//# sourceMappingURL=generate-slots.dto.d.ts.map