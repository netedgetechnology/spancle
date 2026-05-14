export declare const COURT_STATUSES: readonly ["available", "unavailable", "maintenance", "retired"];
export declare const COURT_TYPES: readonly ["indoor", "outdoor"];
export declare const SURFACE_TYPES: readonly ["grass", "artificial_grass", "hard_court", "clay", "carpet", "wood", "rubber", "sand", "water", "ice", "other"];
export declare class CreateCourtDto {
    /** Branch this court belongs to — must be in the same tenant */
    branchId: string;
    /**
     * Optional primary sport — null means multi-sport / sport selected at booking.
     * Must belong to the same tenant if provided.
     */
    sportId?: string;
    name: string;
    /** Short display code for calendars — e.g. "C1" */
    code?: string;
    description?: string;
    courtType?: typeof COURT_TYPES[number];
    surfaceType?: typeof SURFACE_TYPES[number];
    capacity?: number;
    maxBookingsConcurrent?: number;
    /** Court dimensions string — e.g. "68m × 105m" */
    dimensions?: string;
    status?: typeof COURT_STATUSES[number];
    /**
     * WeeklyTimings JSONB — court-specific hours.
     * Omit to inherit from parent branch.
     */
    operatingHours?: Record<string, unknown>;
    courtNumber?: number;
    sortOrder?: number;
    imageUrl?: string;
    amenities?: string[];
    hourlyRateMinor?: number;
}
export declare class UpdateCourtDto {
    sportId?: string | null;
    name?: string;
    code?: string;
    description?: string;
    courtType?: typeof COURT_TYPES[number];
    surfaceType?: typeof SURFACE_TYPES[number];
    capacity?: number;
    maxBookingsConcurrent?: number;
    dimensions?: string;
    status?: typeof COURT_STATUSES[number];
    operatingHours?: Record<string, unknown> | null;
    sortOrder?: number;
    imageUrl?: string;
    amenities?: string[];
    hourlyRateMinor?: number;
}
export declare class CourtStatusDto {
    status: typeof COURT_STATUSES[number];
}
/**
 * MaintenanceDto — sets a court into maintenance with a reason and optional
 * expected completion date. Used by PATCH /courts/:id/maintenance.
 */
export declare class MaintenanceDto {
    maintenanceNote: string;
    /** ISO-8601 datetime — expected maintenance end */
    maintenanceExpectedEnd?: string;
}
/**
 * GenerateCourtsDto — bulk court generation.
 *
 * Generates `count` courts with auto-incrementing names:
 *   namePrefix + separator + startNumber … startNumber + count - 1
 *
 * Examples:
 *   prefix="Court" separator=" " startNumber=1 count=6
 *   → Court 1, Court 2, Court 3, Court 4, Court 5, Court 6
 *
 *   prefix="Lane" separator="-" startNumber=1 count=8
 *   → Lane-1, Lane-2 … Lane-8
 */
export declare class GenerateCourtsDto {
    /** Branch to generate courts in */
    branchId: string;
    /** Optional primary sport for all generated courts */
    sportId?: string;
    /** Name prefix — e.g. "Court", "Lane", "Pitch", "Pool" */
    namePrefix: string;
    /** Separator between prefix and number — e.g. " ", "-", "_" */
    separator?: string;
    /** Starting number for the sequence */
    startNumber?: number;
    /** Number of courts to generate */
    count: number;
    courtType?: typeof COURT_TYPES[number];
    surfaceType?: typeof SURFACE_TYPES[number];
    capacity?: number;
    operatingHours?: Record<string, unknown>;
}
//# sourceMappingURL=create-court.dto.d.ts.map