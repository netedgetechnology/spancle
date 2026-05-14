import type { WeeklyTimings } from '../../../modules/branch/entities/branch.entity';
/**
 * Court operational status lifecycle:
 *   available    — open and bookable
 *   unavailable  — temporarily closed / not accepting bookings
 *   maintenance  — under maintenance; surfaced to admins with a warning
 *   retired      — permanently decommissioned; historical record only
 */
export type CourtStatus = 'available' | 'unavailable' | 'maintenance' | 'retired';
export type SurfaceType = 'grass' | 'artificial_grass' | 'hard_court' | 'clay' | 'carpet' | 'wood' | 'rubber' | 'sand' | 'water' | 'ice' | 'other';
export type CourtType = 'indoor' | 'outdoor';
/**
 * CourtEntity — a bookable court / pitch / lane / pool within a branch.
 *
 * Design decisions:
 *
 *   - A court MUST belong to a branch (branchId non-nullable).
 *   - A court MAY be linked to a primary sport (sportId nullable).
 *     Multi-sport courts leave sportId null; the booking layer handles
 *     sport selection at booking time.
 *
 *   - `operatingHours`: court-specific schedule (JSONB, WeeklyTimings shape).
 *     Defaults to null — when null, the parent branch operating hours apply.
 *     When set, court hours override branch hours for this court specifically.
 *
 *   - `maintenanceNote`: free-text reason visible to admins when status = maintenance.
 *
 *   - Unique: (tenant_id, branch_id, name) — no two courts in the same branch
 *     share a name. Enforced at DB level + service layer.
 *
 *   - `courtNumber`: optional numeric identifier used for bulk-generated courts
 *     (e.g. Court 1, Court 2…). Stored separately so sorting is numeric, not lexical.
 *
 * Table: `courts`
 */
export declare class CourtEntity {
    id: string;
    tenantId: string;
    /** FK → branches.id (same tenant) — enforced at service layer */
    branchId: string;
    /**
     * Optional FK → sports.id (same tenant).
     * Null = multi-sport / sport selected at booking time.
     */
    sportId: string | null;
    /** Display name — unique per branch. e.g. "Court 1", "Centre Court", "Pool A" */
    name: string;
    /** Optional short code for display in calendars — e.g. "C1", "CC" */
    code: string | null;
    description: string | null;
    courtType: CourtType;
    surfaceType: SurfaceType;
    /** Maximum number of concurrent players/participants on this court */
    capacity: number | null;
    /** Maximum number of simultaneous bookings (usually 1, or 2 for shared lanes) */
    maxBookingsConcurrent: number;
    /** Court dimensions in metres — e.g. "68m × 105m" */
    dimensions: string | null;
    status: CourtStatus;
    /**
     * Free-text maintenance reason — shown to admins when status = maintenance.
     * Cleared automatically when status transitions away from maintenance.
     */
    maintenanceNote: string | null;
    /** When the court was placed into maintenance */
    maintenanceStartedAt: Date | null;
    /** Expected maintenance completion date */
    maintenanceExpectedEnd: Date | null;
    /**
     * Court-specific operating hours (WeeklyTimings JSONB).
     * Null = inherit from parent branch.
     * Set = these hours override branch hours for this specific court.
     */
    operatingHours: WeeklyTimings | null;
    /** Numeric sort key — used for bulk-generated courts (Court 1, 2, 3…) */
    courtNumber: number | null;
    sortOrder: number;
    /** Cover image URL for display in booking interfaces */
    imageUrl: string | null;
    /** Amenity tags — e.g. ['floodlights', 'changing_rooms', 'parking'] */
    amenities: string[] | null;
    /** Hourly rate in minor currency units (pence/cents). Null = use branch default */
    hourlyRateMinor: number | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=court.entity.d.ts.map