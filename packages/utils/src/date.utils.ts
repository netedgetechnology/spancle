import {
  format,
  formatDistanceToNow,
  formatDuration,
  intervalToDuration,
  isAfter,
  isBefore,
  isValid,
  parseISO,
  addDays,
  addHours,
  addMinutes,
  differenceInMinutes,
  differenceInDays,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns';

/** Parses an ISO-8601 string and returns null if invalid. */
export function parseDate(value: string): Date | null {
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

/** Formats a Date to display format. Default: DD/MM/YYYY */
export function formatDate(date: Date, pattern = 'dd/MM/yyyy'): string {
  return format(date, pattern);
}

/** Formats a Date to ISO-8601 string. */
export function toIsoString(date: Date): string {
  return date.toISOString();
}

/** "3 hours ago", "in 2 days" etc. */
export function fromNow(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Human-readable duration from minutes. */
export function formatMinutes(minutes: number): string {
  return formatDuration(intervalToDuration({ start: 0, end: minutes * 60 * 1000 }));
}

export function isExpired(expiryDate: Date): boolean {
  return isAfter(new Date(), expiryDate);
}

export function isInFuture(date: Date): boolean {
  return isAfter(date, new Date());
}

export function isInPast(date: Date): boolean {
  return isBefore(date, new Date());
}

export function minutesBetween(from: Date, to: Date): number {
  return differenceInMinutes(to, from);
}

export function daysBetween(from: Date, to: Date): number {
  return differenceInDays(to, from);
}

export { addDays, addHours, addMinutes, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth };
