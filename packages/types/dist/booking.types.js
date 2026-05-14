"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotSchema = exports.CreateBookingSchema = exports.BookingStatusSchema = void 0;
const zod_1 = require("zod");
const common_types_1 = require("./common.types");
exports.BookingStatusSchema = zod_1.z.enum([
    'pending', 'confirmed', 'cancelled', 'completed', 'no_show',
]);
exports.CreateBookingSchema = zod_1.z.object({
    venueId: zod_1.z.string().uuid(),
    slotId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    notes: zod_1.z.string().max(1000).optional(),
    participants: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
exports.SlotSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    venueId: zod_1.z.string().uuid(),
    startsAt: zod_1.z.string().datetime(),
    endsAt: zod_1.z.string().datetime(),
    capacity: zod_1.z.number().int().positive(),
    booked: zod_1.z.number().int().min(0),
    price: common_types_1.MoneySchema,
    isActive: zod_1.z.boolean(),
});
//# sourceMappingURL=booking.types.js.map