declare const UPDATABLE_STATUSES: readonly ["available", "unavailable", "cancelled"];
export declare class UpdateSlotDto {
    status?: typeof UPDATABLE_STATUSES[number];
    priceOverrideMinor?: number | null;
    label?: string;
    notes?: string;
    maxBookings?: number;
}
export {};
//# sourceMappingURL=update-slot.dto.d.ts.map