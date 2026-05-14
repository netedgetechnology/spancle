"use strict";
/**
 * SlotUtils — stateless time math helpers for the slot engine.
 * No dependencies. No side effects. Pure functions only.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotUtils = void 0;
class SlotUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:slot:${suffix}`;
    }
    /**
     * Chops a day window into time slots of durationMins with bufferMins gap.
     * Returns empty array if the window is too short for one slot.
     */
    static chopIntoSlots(date, openTime, closeTime, durationMins, bufferMins = 0) {
        const slots = [];
        const windowStart = SlotUtils.toUtcDate(date, openTime);
        const windowEnd = SlotUtils.toUtcDate(date, closeTime);
        const stepMs = (durationMins + bufferMins) * 60_000;
        const slotMs = durationMins * 60_000;
        let cursor = windowStart.getTime();
        while (cursor + slotMs <= windowEnd.getTime()) {
            slots.push({
                startAt: new Date(cursor),
                endAt: new Date(cursor + slotMs),
                durationMins,
            });
            cursor += stepMs;
        }
        return slots;
    }
    /** Converts YYYY-MM-DD + HH:MM into a UTC Date (no tz conversion). */
    static toUtcDate(date, time) {
        return new Date(`${date}T${time}:00.000Z`);
    }
    /** Returns the lowercase UTC day-of-week for a Date. */
    static getDayOfWeek(date) {
        const days = [
            'sunday', 'monday', 'tuesday', 'wednesday',
            'thursday', 'friday', 'saturday',
        ];
        return days[date.getUTCDay()];
    }
    static isWeekend(date) {
        const day = date.getUTCDay();
        return day === 0 || day === 6;
    }
    /** Iterates YYYY-MM-DD strings for every date in [startDate, endDate]. */
    static *iterateDates(startDate, endDate) {
        const current = new Date(`${startDate}T00:00:00.000Z`);
        const end = new Date(`${endDate}T00:00:00.000Z`);
        while (current <= end) {
            yield current.toISOString().slice(0, 10);
            current.setUTCDate(current.getUTCDate() + 1);
        }
    }
    static daysBetween(startDate, endDate) {
        const s = new Date(`${startDate}T00:00:00.000Z`).getTime();
        const e = new Date(`${endDate}T00:00:00.000Z`).getTime();
        return Math.round((e - s) / 86_400_000);
    }
    static addDays(date, days) {
        const d = new Date(`${date}T00:00:00.000Z`);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }
    static todayUtc() {
        return new Date().toISOString().slice(0, 10);
    }
    /** [aStart,aEnd) overlaps [bStart,bEnd)? Touching edges = false. */
    static overlaps(aStart, aEnd, bStart, bEnd) {
        return aStart < bEnd && aEnd > bStart;
    }
    static buildLabel(courtName, startAt, endAt) {
        const day = startAt.toUTCString().slice(0, 3);
        const start = startAt.toISOString().slice(11, 16);
        const end = endAt.toISOString().slice(11, 16);
        return `${courtName} — ${day} ${start}–${end}`;
    }
    static durationMins(startAt, endAt) {
        return Math.round((endAt.getTime() - startAt.getTime()) / 60_000);
    }
    static toHHMM(date) {
        return date.toISOString().slice(11, 16);
    }
}
exports.SlotUtils = SlotUtils;
//# sourceMappingURL=slot.utils.js.map