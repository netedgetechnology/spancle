import type { Money } from '@spancle/types';

/**
 * Number and currency utilities.
 * All money values are stored in minor units (pence/cents).
 */

/** Converts minor units to display amount: 1099 -> 10.99 */
export function minorToMajor(minorUnits: number): number {
  return minorUnits / 100;
}

/** Converts major units to minor units: 10.99 -> 1099 */
export function majorToMinor(majorUnits: number): number {
  return Math.round(majorUnits * 100);
}

/** Formats a Money object to a locale string: { amount: 1099, currency: 'GBP' } -> '£10.99' */
export function formatMoney(money: Money, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale, {
    style:    'currency',
    currency: money.currency,
  }).format(minorToMajor(money.amount));
}

/** Safe addition of two Money values — must be same currency */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
  return { amount: a.amount + b.amount, currency: a.currency };
}

/** Calculates percentage: calculatePercent(1000, 10) -> 100 (minor units) */
export function calculatePercent(amount: number, percent: number): number {
  return Math.round((amount * percent) / 100);
}

/** Clamps a number between min and max (inclusive) */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Formats a number with locale-aware thousands separator */
export function formatNumber(value: number, locale = 'en-GB'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/** Returns a human-readable file size: 1024 -> '1 KB' */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
