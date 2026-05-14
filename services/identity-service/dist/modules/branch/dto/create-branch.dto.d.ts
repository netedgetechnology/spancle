export declare class DayTimingDto {
    isClosed: boolean;
    /**
     * HH:MM 24-hour format — e.g. "09:00", "21:30"
     * Required even when isClosed: true (preserves the time for when re-opened).
     */
    openTime: string;
    closeTime: string;
}
export declare class WeeklyTimingsDto {
    monday: DayTimingDto;
    tuesday: DayTimingDto;
    wednesday: DayTimingDto;
    thursday: DayTimingDto;
    friday: DayTimingDto;
    saturday: DayTimingDto;
    sunday: DayTimingDto;
}
declare const BRANCH_STATUSES: readonly ["active", "inactive", "suspended", "archived"];
export declare class CreateBranchDto {
    name: string;
    /**
     * URL-safe slug — lowercase alphanumeric + hyphens.
     * Unique per tenant.
     */
    slug: string;
    description?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    county?: string;
    postcode: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    geoLabel?: string;
    phone?: string;
    email?: string;
    website?: string;
    managerUserId?: string;
    status?: typeof BRANCH_STATUSES[number];
    timings?: WeeklyTimingsDto;
    mapUrl?: string;
    facilities?: string[];
    imageUrl?: string;
    sortOrder?: number;
}
export declare class UpdateBranchDto {
    name?: string;
    description?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    postcode?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
    geoLabel?: string;
    phone?: string;
    email?: string;
    website?: string;
    managerUserId?: string | null;
    status?: typeof BRANCH_STATUSES[number];
    timings?: WeeklyTimingsDto;
    mapUrl?: string;
    facilities?: string[];
    imageUrl?: string;
    sortOrder?: number;
}
export declare class AssignManagerDto {
    /** Pass null to unassign the current manager */
    managerUserId: string | null;
}
export declare class BranchStatusDto {
    status: typeof BRANCH_STATUSES[number];
}
export {};
//# sourceMappingURL=create-branch.dto.d.ts.map