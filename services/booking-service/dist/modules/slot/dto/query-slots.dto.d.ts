declare const SLOT_STATUSES: readonly ["available", "reserved", "booked", "cancelled", "completed"];
export declare class QuerySlotsDto {
    courtId?: string;
    branchId?: string;
    sportId?: string;
    /** ISO date string — filter slots starting on or after this date */
    from?: string;
    /** ISO date string — filter slots starting before this date */
    to?: string;
    status?: typeof SLOT_STATUSES[number];
}
export {};
//# sourceMappingURL=query-slots.dto.d.ts.map