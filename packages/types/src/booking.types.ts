import { z } from 'zod';
import type { AuditFields, Money, TenantId, UUID } from './common.types';
import { MoneySchema } from './common.types';

export const BookingStatusSchema = z.enum([
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show',
]);
export type BookingStatus = z.infer<typeof BookingStatusSchema>;

export const CreateBookingSchema = z.object({
  venueId:     z.string().uuid(),
  slotId:      z.string().uuid(),
  userId:      z.string().uuid(),
  notes:       z.string().max(1000).optional(),
  participants: z.array(z.string().uuid()).optional(),
});

export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;

export const SlotSchema = z.object({
  id:        z.string().uuid(),
  venueId:   z.string().uuid(),
  startsAt:  z.string().datetime(),
  endsAt:    z.string().datetime(),
  capacity:  z.number().int().positive(),
  booked:    z.number().int().min(0),
  price:     MoneySchema,
  isActive:  z.boolean(),
});

export type Slot = z.infer<typeof SlotSchema>;

export interface Booking extends AuditFields {
  id:           UUID;
  tenantId:     TenantId;
  venueId:      UUID;
  slotId:       UUID;
  userId:       UUID;
  status:       BookingStatus;
  price:        Money;
  notes?:       string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  isDeleted:    boolean;
}

export interface Venue extends AuditFields {
  id:          UUID;
  tenantId:    TenantId;
  name:        string;
  description?: string;
  capacity:    number;
  isActive:    boolean;
  isDeleted:   boolean;
}
