/**
 * SlotUtils — stateless time math helpers for the slot engine.
 * No dependencies. No side effects. Pure functions only.
 */
export interface TimeSlot {
    startAt: Date;
    endAt: Date;
    durationMins: number;
}
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export declare class SlotUtils {
    static redisKey(tenantId: string, suffix: string): string;
    /**
     * Chops a day window into time slots of durationMins with bufferMins gap.
     * Returns empty array if the window is too short for one slot.
     */
    static chopIntoSlots(date: string, openTime: string, closeTime: string, durationMins: number, bufferMins?: number): TimeSlot[];
    /** Converts YYYY-MM-DD + HH:MM into a UTC Date (no tz conversion). */
    static toUtcDate(date: string, time: string): Date;
    /** Returns the lowercase UTC day-of-week for a Date. */
    static getDayOfWeek(date: Date): DayOfWeek;
    static isWeekend(date: Date): boolean;
    /** Iterates YYYY-MM-DD strings for every date in [startDate, endDate]. */
    static iterateDates(startDate: string, endDate: string): Generator<string>;
    static daysBetween(startDate: string, endDate: string): number;
    static addDays(date: string, days: number): string;
    static todayUtc(): string;
    /** [aStart,aEnd) overlaps [bStart,bEnd)? Touching edges = false. */
    static overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean;
    static buildLabel(courtName: string, startAt: Date, endAt: Date): string;
    static durationMins(startAt: Date, endAt: Date): number;
    static toHHMM(date: Date): string;
}
//# sourceMappingURL=slot.utils.d.ts.map