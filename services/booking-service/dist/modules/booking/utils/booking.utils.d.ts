export declare class BookingUtils {
    static redisKey(tenantId: string, suffix: string): string;
    /**
     * Generates a human-readable booking reference.
     * Format: BK-YYYYMMDD-XXXXXX (X = uppercase alphanumeric, 6 chars)
     * Example: BK-20250621-X4K9QR
     */
    static generateReference(): string;
    /** Masks all but last 4 chars — used before writing diffs to booking_logs */
    static maskSensitive(value: string): string;
    /**
     * Sanitises a diff object before logging.
     * Removes known sensitive keys and masks card-related values.
     */
    static sanitiseDiff(diff: Record<string, unknown>): Record<string, unknown>;
    /** Adds a number of days to an ISO date string (YYYY-MM-DD) */
    static addDays(date: string, days: number): string;
    /** Adds a number of weeks to an ISO date string */
    static addWeeks(date: string, weeks: number): string;
    /** Adds a number of months to an ISO date string */
    static addMonths(date: string, months: number): string;
    /**
     * Given a base date and recurrence config, returns an array of
     * ISO date offsets (in days from base) for each occurrence.
     */
    static recurrenceOffsets(frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly', occurrences: number, until?: string): number[];
}
//# sourceMappingURL=booking.utils.d.ts.map