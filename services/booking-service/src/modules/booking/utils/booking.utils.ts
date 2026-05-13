import { randomBytes } from 'node:crypto';

export class BookingUtils {
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:booking:${suffix}`;
  }

  /**
   * Generates a human-readable booking reference.
   * Format: BK-YYYYMMDD-XXXXXX (X = uppercase alphanumeric, 6 chars)
   * Example: BK-20250621-X4K9QR
   */
  static generateReference(): string {
    const date    = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const suffix  = randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
    return `BK-${date}-${suffix}`;
  }

  /** Masks all but last 4 chars — used before writing diffs to booking_logs */
  static maskSensitive(value: string): string {
    if (value.length <= 4) return '****';
    return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
  }

  /**
   * Sanitises a diff object before logging.
   * Removes known sensitive keys and masks card-related values.
   */
  static sanitiseDiff(diff: Record<string, unknown>): Record<string, unknown> {
    const REMOVE_KEYS = new Set(['password', 'cvv', 'cvc', 'card_number', 'cardNumber']);
    const MASK_KEYS   = new Set(['pan', 'card', 'token', 'providerPaymentId']);
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(diff)) {
      if (REMOVE_KEYS.has(key)) continue;
      if (MASK_KEYS.has(key) && typeof value === 'string') {
        out[key] = BookingUtils.maskSensitive(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  /** Adds a number of days to an ISO date string (YYYY-MM-DD) */
  static addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }

  /** Adds a number of weeks to an ISO date string */
  static addWeeks(date: string, weeks: number): string {
    return BookingUtils.addDays(date, weeks * 7);
  }

  /** Adds a number of months to an ISO date string */
  static addMonths(date: string, months: number): string {
    const d = new Date(`${date}T00:00:00.000Z`);
    d.setUTCMonth(d.getUTCMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  /**
   * Given a base date and recurrence config, returns an array of
   * ISO date offsets (in days from base) for each occurrence.
   */
  static recurrenceOffsets(
    frequency:   'daily' | 'weekly' | 'biweekly' | 'monthly',
    occurrences: number,
    until?:      string,
  ): number[] {
    const offsets: number[] = [];
    const baseDate = new Date().toISOString().slice(0, 10);

    for (let i = 1; i < occurrences; i++) {
      let nextDate: string;
      switch (frequency) {
        case 'daily':     nextDate = BookingUtils.addDays(baseDate, i);        break;
        case 'weekly':    nextDate = BookingUtils.addWeeks(baseDate, i);       break;
        case 'biweekly':  nextDate = BookingUtils.addWeeks(baseDate, i * 2);  break;
        case 'monthly':   nextDate = BookingUtils.addMonths(baseDate, i);      break;
      }
      if (until && nextDate > until) break;
      const diffDays = Math.round(
        (new Date(`${nextDate}T00:00:00.000Z`).getTime() - new Date(`${baseDate}T00:00:00.000Z`).getTime())
        / 86_400_000,
      );
      offsets.push(diffDays);
    }

    return offsets;
  }
}
