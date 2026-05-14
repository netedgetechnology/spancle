import type { Money } from '@spancle/types';
/**
 * Number and currency utilities.
 * All money values are stored in minor units (pence/cents).
 */
/** Converts minor units to display amount: 1099 -> 10.99 */
export declare function minorToMajor(minorUnits: number): number;
/** Converts major units to minor units: 10.99 -> 1099 */
export declare function majorToMinor(majorUnits: number): number;
/** Formats a Money object to a locale string: { amount: 1099, currency: 'GBP' } -> '£10.99' */
export declare function formatMoney(money: Money, locale?: string): string;
/** Safe addition of two Money values — must be same currency */
export declare function addMoney(a: Money, b: Money): Money;
/** Calculates percentage: calculatePercent(1000, 10) -> 100 (minor units) */
export declare function calculatePercent(amount: number, percent: number): number;
/** Clamps a number between min and max (inclusive) */
export declare function clamp(value: number, min: number, max: number): number;
/** Formats a number with locale-aware thousands separator */
export declare function formatNumber(value: number, locale?: string): string;
/** Returns a human-readable file size: 1024 -> '1 KB' */
export declare function formatFileSize(bytes: number): string;
//# sourceMappingURL=number.utils.d.ts.map