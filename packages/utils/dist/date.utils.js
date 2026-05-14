"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endOfMonth = exports.startOfMonth = exports.endOfWeek = exports.startOfWeek = exports.endOfDay = exports.startOfDay = exports.addMinutes = exports.addHours = exports.addDays = void 0;
exports.parseDate = parseDate;
exports.formatDate = formatDate;
exports.toIsoString = toIsoString;
exports.fromNow = fromNow;
exports.formatMinutes = formatMinutes;
exports.isExpired = isExpired;
exports.isInFuture = isInFuture;
exports.isInPast = isInPast;
exports.minutesBetween = minutesBetween;
exports.daysBetween = daysBetween;
const date_fns_1 = require("date-fns");
Object.defineProperty(exports, "addDays", { enumerable: true, get: function () { return date_fns_1.addDays; } });
Object.defineProperty(exports, "addHours", { enumerable: true, get: function () { return date_fns_1.addHours; } });
Object.defineProperty(exports, "addMinutes", { enumerable: true, get: function () { return date_fns_1.addMinutes; } });
Object.defineProperty(exports, "startOfDay", { enumerable: true, get: function () { return date_fns_1.startOfDay; } });
Object.defineProperty(exports, "endOfDay", { enumerable: true, get: function () { return date_fns_1.endOfDay; } });
Object.defineProperty(exports, "startOfWeek", { enumerable: true, get: function () { return date_fns_1.startOfWeek; } });
Object.defineProperty(exports, "endOfWeek", { enumerable: true, get: function () { return date_fns_1.endOfWeek; } });
Object.defineProperty(exports, "startOfMonth", { enumerable: true, get: function () { return date_fns_1.startOfMonth; } });
Object.defineProperty(exports, "endOfMonth", { enumerable: true, get: function () { return date_fns_1.endOfMonth; } });
/** Parses an ISO-8601 string and returns null if invalid. */
function parseDate(value) {
    const d = (0, date_fns_1.parseISO)(value);
    return (0, date_fns_1.isValid)(d) ? d : null;
}
/** Formats a Date to display format. Default: DD/MM/YYYY */
function formatDate(date, pattern = 'dd/MM/yyyy') {
    return (0, date_fns_1.format)(date, pattern);
}
/** Formats a Date to ISO-8601 string. */
function toIsoString(date) {
    return date.toISOString();
}
/** "3 hours ago", "in 2 days" etc. */
function fromNow(date) {
    return (0, date_fns_1.formatDistanceToNow)(date, { addSuffix: true });
}
/** Human-readable duration from minutes. */
function formatMinutes(minutes) {
    return (0, date_fns_1.formatDuration)((0, date_fns_1.intervalToDuration)({ start: 0, end: minutes * 60 * 1000 }));
}
function isExpired(expiryDate) {
    return (0, date_fns_1.isAfter)(new Date(), expiryDate);
}
function isInFuture(date) {
    return (0, date_fns_1.isAfter)(date, new Date());
}
function isInPast(date) {
    return (0, date_fns_1.isBefore)(date, new Date());
}
function minutesBetween(from, to) {
    return (0, date_fns_1.differenceInMinutes)(to, from);
}
function daysBetween(from, to) {
    return (0, date_fns_1.differenceInDays)(to, from);
}
//# sourceMappingURL=date.utils.js.map