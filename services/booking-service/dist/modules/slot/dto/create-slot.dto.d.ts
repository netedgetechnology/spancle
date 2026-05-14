declare const SLOT_STATUSES: readonly ["available", "unavailable"];
export declare class CreateSlotDto {
    courtId: string;
    branchId: string;
    sportId?: string;
    startAt: string;
    endAt: string;
    durationMins: number;
    status?: typeof SLOT_STATUSES[number];
    priceOverrideMinor?: number;
    label?: string;
    notes?: string;
    maxBookings?: number;
}
export {};
//# sourceMappingURL=create-slot.dto.d.ts.map