"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOOKING_EVENT_SCHEMAS = exports.BookingCompletedPayloadSchema = exports.BookingCancelledPayloadSchema = exports.BookingCreatedPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
const BaseBookingPayload = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    bookingId: zod_1.z.string().uuid(),
    userId: zod_1.z.string().uuid(),
    venueId: zod_1.z.string().uuid(),
    slotId: zod_1.z.string().uuid(),
});
exports.BookingCreatedPayloadSchema = BaseBookingPayload.extend({
    price: zod_1.z.object({ amount: zod_1.z.number(), currency: zod_1.z.string() }),
    startsAt: zod_1.z.string().datetime(),
    endsAt: zod_1.z.string().datetime(),
});
exports.BookingCancelledPayloadSchema = BaseBookingPayload.extend({
    reason: zod_1.z.string().optional(),
    cancelledBy: zod_1.z.string().uuid(),
    refundable: zod_1.z.boolean().default(false),
});
exports.BookingCompletedPayloadSchema = BaseBookingPayload.extend({
    completedAt: zod_1.z.string().datetime(),
    durationMin: zod_1.z.number().int().positive(),
});
exports.BOOKING_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.BOOKING_CREATED]: exports.BookingCreatedPayloadSchema,
    [event_registry_1.EventRegistry.BOOKING_CONFIRMED]: BaseBookingPayload,
    [event_registry_1.EventRegistry.BOOKING_CANCELLED]: exports.BookingCancelledPayloadSchema,
    [event_registry_1.EventRegistry.BOOKING_COMPLETED]: exports.BookingCompletedPayloadSchema,
};
//# sourceMappingURL=booking.events.js.map