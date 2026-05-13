import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

const BaseBookingPayload = z.object({
  tenantId:  z.string().uuid(),
  bookingId: z.string().uuid(),
  userId:    z.string().uuid(),
  venueId:   z.string().uuid(),
  slotId:    z.string().uuid(),
});

export const BookingCreatedPayloadSchema = BaseBookingPayload.extend({
  price:     z.object({ amount: z.number(), currency: z.string() }),
  startsAt:  z.string().datetime(),
  endsAt:    z.string().datetime(),
});

export const BookingCancelledPayloadSchema = BaseBookingPayload.extend({
  reason:      z.string().optional(),
  cancelledBy: z.string().uuid(),
  refundable:  z.boolean().default(false),
});

export const BookingCompletedPayloadSchema = BaseBookingPayload.extend({
  completedAt: z.string().datetime(),
  durationMin: z.number().int().positive(),
});

export type BookingCreatedPayload   = z.infer<typeof BookingCreatedPayloadSchema>;
export type BookingCancelledPayload = z.infer<typeof BookingCancelledPayloadSchema>;
export type BookingCompletedPayload = z.infer<typeof BookingCompletedPayloadSchema>;

export const BOOKING_EVENT_SCHEMAS = {
  [EventRegistry.BOOKING_CREATED]:   BookingCreatedPayloadSchema,
  [EventRegistry.BOOKING_CONFIRMED]: BaseBookingPayload,
  [EventRegistry.BOOKING_CANCELLED]: BookingCancelledPayloadSchema,
  [EventRegistry.BOOKING_COMPLETED]: BookingCompletedPayloadSchema,
} as const;
