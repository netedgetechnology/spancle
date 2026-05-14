"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minorToMajor = minorToMajor;
exports.majorToMinor = majorToMinor;
exports.formatMoney = formatMoney;
exports.addMoney = addMoney;
exports.calculatePercent = calculatePercent;
exports.clamp = clamp;
exports.formatNumber = formatNumber;
exports.formatFileSize = formatFileSize;
/**
 * Number and currency utilities.
 * All money values are stored in minor units (pence/cents).
 */
/** Converts minor units to display amount: 1099 -> 10.99 */
function minorToMajor(minorUnits) {
    return minorUnits / 100;
}
/** Converts major units to minor units: 10.99 -> 1099 */
function majorToMinor(majorUnits) {
    return Math.round(majorUnits * 100);
}
/** Formats a Money object to a locale string: { amount: 1099, currency: 'GBP' } -> '£10.99' */
function formatMoney(money, locale = 'en-GB') {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: money.currency,
    }).format(minorToMajor(money.amount));
}
/** Safe addition of two Money values — must be same currency */
function addMoney(a, b) {
    if (a.currency !== b.currency) {
        throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
    }
    return { amount: a.amount + b.amount, currency: a.currency };
}
/** Calculates percentage: calculatePercent(1000, 10) -> 100 (minor units) */
function calculatePercent(amount, percent) {
    return Math.round((amount * percent) / 100);
}
/** Clamps a number between min and max (inclusive) */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
/** Formats a number with locale-aware thousands separator */
function formatNumber(value, locale = 'en-GB') {
    return new Intl.NumberFormat(locale).format(value);
}
/** Returns a human-readable file size: 1024 -> '1 KB' */
function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}
//# sourceMappingURL=number.utils.js.map