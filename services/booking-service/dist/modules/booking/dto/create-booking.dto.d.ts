declare const CHANNELS: readonly ["online", "admin", "walk_in", "api"];
declare const RECURRENCE_FREQS: readonly ["daily", "weekly", "biweekly", "monthly"];
export declare class BookingCustomerDto {
    name: string;
    email: string;
    phone?: string;
    isMember?: boolean;
    userId?: string;
}
export declare class RecurrenceDto {
    frequency: typeof RECURRENCE_FREQS[number];
    occurrences: number;
    /** ISO date string — stop generating after this date (alternative to occurrences) */
    until?: string;
}
export declare class CreateBookingDto {
    slotIds: string[];
    branchId: string;
    courtId: string;
    sportId?: string;
    customer: BookingCustomerDto;
    channel?: typeof CHANNELS[number];
    participantCount?: number;
    customerNotes?: string;
    internalNotes?: string;
    metadata?: Record<string, unknown>;
    /** When present, generates a recurring series from these slots */
    recurrence?: RecurrenceDto;
}
export {};
//# sourceMappingURL=create-booking.dto.d.ts.map