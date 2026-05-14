import { z } from 'zod';
export declare const BookingCreatedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    bookingId: z.ZodString;
    userId: z.ZodString;
    venueId: z.ZodString;
    slotId: z.ZodString;
} & {
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
    startsAt: z.ZodString;
    endsAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    bookingId: string;
    venueId: string;
    slotId: string;
    price: {
        currency: string;
        amount: number;
    };
    startsAt: string;
    endsAt: string;
}, {
    tenantId: string;
    userId: string;
    bookingId: string;
    venueId: string;
    slotId: string;
    price: {
        currency: string;
        amount: number;
    };
    startsAt: string;
    endsAt: string;
}>;
export declare const BookingCancelledPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    bookingId: z.ZodString;
    userId: z.ZodString;
    venueId: z.ZodString;
    slotId: z.ZodString;
} & {
    reason: z.ZodOptional<z.ZodString>;
    cancelledBy: z.ZodString;
    refundable: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    bookingId: string;
    venueId: string;
    slotId: string;
    cancelledBy: string;
    refundable: boolean;
    reason?: string | undefined;
}, {
    tenantId: string;
    userId: string;
    bookingId: string;
    venueId: string;
    slotId: string;
    cancelledBy: string;
    reason?: string | undefined;
    refundable?: boolean | undefined;
}>;
export declare const BookingCompletedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    bookingId: z.ZodString;
    userId: z.ZodString;
    venueId: z.ZodString;
    slotId: z.ZodString;
} & {
    completedAt: z.ZodString;
    durationMin: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    userId: string;
    bookingId: string;
    venueId: string;
    slotId: string;
    completedAt: string;
    durationMin: number;
}, {
    tenantId: string;
    userId: string;
    bookingId: string;
    venueId: string;
    slotId: string;
    completedAt: string;
    durationMin: number;
}>;
export type BookingCreatedPayload = z.infer<typeof BookingCreatedPayloadSchema>;
export type BookingCancelledPayload = z.infer<typeof BookingCancelledPayloadSchema>;
export type BookingCompletedPayload = z.infer<typeof BookingCompletedPayloadSchema>;
export declare const BOOKING_EVENT_SCHEMAS: {
    readonly "spancle.booking.created": z.ZodObject<{
        tenantId: z.ZodString;
        bookingId: z.ZodString;
        userId: z.ZodString;
        venueId: z.ZodString;
        slotId: z.ZodString;
    } & {
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
        startsAt: z.ZodString;
        endsAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
        price: {
            currency: string;
            amount: number;
        };
        startsAt: string;
        endsAt: string;
    }, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
        price: {
            currency: string;
            amount: number;
        };
        startsAt: string;
        endsAt: string;
    }>;
    readonly "spancle.booking.confirmed": z.ZodObject<{
        tenantId: z.ZodString;
        bookingId: z.ZodString;
        userId: z.ZodString;
        venueId: z.ZodString;
        slotId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
    }, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
    }>;
    readonly "spancle.booking.cancelled": z.ZodObject<{
        tenantId: z.ZodString;
        bookingId: z.ZodString;
        userId: z.ZodString;
        venueId: z.ZodString;
        slotId: z.ZodString;
    } & {
        reason: z.ZodOptional<z.ZodString>;
        cancelledBy: z.ZodString;
        refundable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
        cancelledBy: string;
        refundable: boolean;
        reason?: string | undefined;
    }, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
        cancelledBy: string;
        reason?: string | undefined;
        refundable?: boolean | undefined;
    }>;
    readonly "spancle.booking.completed": z.ZodObject<{
        tenantId: z.ZodString;
        bookingId: z.ZodString;
        userId: z.ZodString;
        venueId: z.ZodString;
        slotId: z.ZodString;
    } & {
        completedAt: z.ZodString;
        durationMin: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
        completedAt: string;
        durationMin: number;
    }, {
        tenantId: string;
        userId: string;
        bookingId: string;
        venueId: string;
        slotId: string;
        completedAt: string;
        durationMin: number;
    }>;
};
//# sourceMappingURL=booking.events.d.ts.map