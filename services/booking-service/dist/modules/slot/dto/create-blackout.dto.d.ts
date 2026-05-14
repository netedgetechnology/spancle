declare const SCOPES: readonly ["tenant", "branch", "court", "sport"];
export declare class CreateBlackoutDto {
    name: string;
    reason?: string;
    scope?: typeof SCOPES[number];
    branchId?: string;
    courtId?: string;
    sportId?: string;
    startAt: string;
    endAt: string;
    allDay?: boolean;
    cancelExistingSlots?: boolean;
    blockNewBookings?: boolean;
}
export {};
//# sourceMappingURL=create-blackout.dto.d.ts.map