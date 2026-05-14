declare const UPDATABLE_STATUSES: readonly ["confirmed", "completed", "cancelled", "no_show", "refunded"];
export declare class UpdateBookingDto {
    status?: typeof UPDATABLE_STATUSES[number];
    customerNotes?: string;
    internalNotes?: string;
    participantCount?: number;
    updatedById?: string;
}
export declare class CancelBookingDto {
    reason: string;
    cancelledById?: string;
}
export declare class RescheduleBookingDto {
    /** New slot IDs — must be available and non-overlapping */
    newSlotIds: string[];
    reason?: string;
}
export declare class CheckInDto {
    checkedInById?: string;
}
export declare class MarkNoShowDto {
    notes?: string;
    actorId?: string;
}
export declare class WaiveNoShowDto {
    reason: string;
    actorId?: string;
}
export declare class PaymentFailedDto {
    reason?: string;
    providerErrorCode?: string;
    providerErrorMessage?: string;
}
export {};
//# sourceMappingURL=update-booking.dto.d.ts.map