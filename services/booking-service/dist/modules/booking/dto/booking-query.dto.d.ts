declare const BOOKING_STATUSES: readonly ["pending_payment", "confirmed", "completed", "cancelled", "no_show", "refunded"];
export declare class BookingQueryDto {
    branchId?: string;
    courtId?: string;
    sportId?: string;
    userId?: string;
    reference?: string;
    status?: typeof BOOKING_STATUSES[number];
    from?: string;
    to?: string;
    limit?: number;
    offset?: number;
}
export {};
//# sourceMappingURL=booking-query.dto.d.ts.map