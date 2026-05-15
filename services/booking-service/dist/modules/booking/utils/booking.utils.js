"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingUtils = void 0;
const node_crypto_1 = require("node:crypto");
class BookingUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:booking:${suffix}`;
    }
    static generateReference() {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const suffix = (0, node_crypto_1.randomBytes)(4).toString('hex').toUpperCase().slice(0, 6);
        return `BK-${date}-${suffix}`;
    }
    static maskSensitive(value) {
        if (value.length <= 4)
            return '****';
        return `${'*'.repeat(value.length - 4)}${value.slice(-4)}`;
    }
    static sanitiseDiff(diff) {
        const REMOVE_KEYS = new Set(['password', 'cvv', 'cvc', 'card_number', 'cardNumber']);
        const MASK_KEYS = new Set(['pan', 'card', 'token', 'providerPaymentId']);
        const out = {};
        for (const [key, value] of Object.entries(diff)) {
            if (REMOVE_KEYS.has(key))
                continue;
            if (MASK_KEYS.has(key) && typeof value === 'string') {
                out[key] = BookingUtils.maskSensitive(value);
            }
            else {
                out[key] = value;
            }
        }
        return out;
    }
    static addDays(date, days) {
        const d = new Date(`${date}T00:00:00.000Z`);
        d.setUTCDate(d.getUTCDate() + days);
        return d.toISOString().slice(0, 10);
    }
    static addWeeks(date, weeks) {
        return BookingUtils.addDays(date, weeks * 7);
    }
    static addMonths(date, months) {
        const d = new Date(`${date}T00:00:00.000Z`);
        d.setUTCMonth(d.getUTCMonth() + months);
        return d.toISOString().slice(0, 10);
    }
    static recurrenceOffsets(frequency, occurrences, until) {
        const offsets = [];
        const baseDate = new Date().toISOString().slice(0, 10);
        for (let i = 1; i < occurrences; i++) {
            let nextDate;
            switch (frequency) {
                case 'daily':
                    nextDate = BookingUtils.addDays(baseDate, i);
                    break;
                case 'weekly':
                    nextDate = BookingUtils.addWeeks(baseDate, i);
                    break;
                case 'biweekly':
                    nextDate = BookingUtils.addWeeks(baseDate, i * 2);
                    break;
                case 'monthly':
                    nextDate = BookingUtils.addMonths(baseDate, i);
                    break;
            }
            if (until && nextDate > until)
                break;
            const diffDays = Math.round((new Date(`${nextDate}T00:00:00.000Z`).getTime() - new Date(`${baseDate}T00:00:00.000Z`).getTime())
                / 86_400_000);
            offsets.push(diffDays);
        }
        return offsets;
    }
}
exports.BookingUtils = BookingUtils;
//# sourceMappingURL=booking.utils.js.map