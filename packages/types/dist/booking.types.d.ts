import { z } from 'zod';
import type { AuditFields, Money, TenantId, UUID } from './common.types';
export declare const BookingStatusSchema: z.ZodEnum<["pending", "confirmed", "cancelled", "completed", "no_show"]>;
export type BookingStatus = z.infer<typeof BookingStatusSchema>;
export declare const CreateBookingSchema: z.ZodObject<{
    venueId: z.ZodString;
    slotId: z.ZodString;
    userId: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
    participants: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    venueId: string;
    slotId: string;
    notes?: string | undefined;
    participants?: string[] | undefined;
}, {
    userId: string;
    venueId: string;
    slotId: string;
    notes?: string | undefined;
    participants?: string[] | undefined;
}>;
export type CreateBookingDto = z.infer<typeof CreateBookingSchema>;
export declare const SlotSchema: z.ZodObject<{
    id: z.ZodString;
    venueId: z.ZodString;
    startsAt: z.ZodString;
    endsAt: z.ZodString;
    capacity: z.ZodNumber;
    booked: z.ZodNumber;
    price: z.ZodObject<{
        amount: z.ZodNumber;
        currency: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        currency: string;
        amount: number;
    }, {
        currency: string;
        amount: number;
    }>;
    isActive: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    venueId: string;
    id: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    booked: number;
    price: {
        currency: string;
        amount: number;
    };
    isActive: boolean;
}, {
    venueId: string;
    id: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    booked: number;
    price: {
        currency: string;
        amount: number;
    };
    isActive: boolean;
}>;
export type Slot = z.infer<typeof SlotSchema>;
export interface Booking extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    venueId: UUID;
    slotId: UUID;
    userId: UUID;
    status: BookingStatus;
    price: Money;
    notes?: string;
    confirmedAt?: Date;
    cancelledAt?: Date;
    isDeleted: boolean;
}
export interface Venue extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    name: string;
    description?: string;
    capacity: number;
    isActive: boolean;
    isDeleted: boolean;
}
//# sourceMappingURL=booking.types.d.ts.map