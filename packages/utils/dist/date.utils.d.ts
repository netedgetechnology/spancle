import { addDays, addHours, addMinutes, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
/** Parses an ISO-8601 string and returns null if invalid. */
export declare function parseDate(value: string): Date | null;
/** Formats a Date to display format. Default: DD/MM/YYYY */
export declare function formatDate(date: Date, pattern?: string): string;
/** Formats a Date to ISO-8601 string. */
export declare function toIsoString(date: Date): string;
/** "3 hours ago", "in 2 days" etc. */
export declare function fromNow(date: Date): string;
/** Human-readable duration from minutes. */
export declare function formatMinutes(minutes: number): string;
export declare function isExpired(expiryDate: Date): boolean;
export declare function isInFuture(date: Date): boolean;
export declare function isInPast(date: Date): boolean;
export declare function minutesBetween(from: Date, to: Date): number;
export declare function daysBetween(from: Date, to: Date): number;
export { addDays, addHours, addMinutes, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth };
//# sourceMappingURL=date.utils.d.ts.map