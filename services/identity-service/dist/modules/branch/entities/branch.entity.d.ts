/**
 * Branch lifecycle:
 *   active    — fully operational, accepts bookings
 *   inactive  — temporarily closed (e.g. refurbishment), no new bookings
 *   suspended — suspended by admin (e.g. compliance issue)
 *   archived  — permanently closed, historical record only
 */
export type BranchStatus = 'active' | 'inactive' | 'suspended' | 'archived';
/**
 * DayTiming — opening hours for a single day.
 * `isClosed: true` marks a day off regardless of time values.
 * Times stored as HH:MM strings in 24-hour format (e.g. "09:00", "21:30").
 */
export interface DayTiming {
    isClosed: boolean;
    openTime: string;
    closeTime: string;
}
/**
 * WeeklyTimings — 7-day schedule keyed by lowercase day name.
 * All 7 keys are always present. Missing days default to closed in the service.
 */
export interface WeeklyTimings {
    monday: DayTiming;
    tuesday: DayTiming;
    wednesday: DayTiming;
    thursday: DayTiming;
    friday: DayTiming;
    saturday: DayTiming;
    sunday: DayTiming;
}
/**
 * BranchEntity — a physical location / branch of a tenant's organisation.
 *
 * Tenant isolation: every row carries tenantId, enforced by repository layer.
 *
 * Geo: latitude + longitude stored as DECIMAL(10,7) — sufficient precision
 * for ~1cm accuracy. Indexed for future geospatial queries.
 *
 * Timings: stored as JSONB WeeklyTimings object — 7-day schedule.
 * Validated at service layer before persist.
 *
 * Manager: optional FK to users.id (same tenant). Validated at service layer.
 *
 * Slug: URL-safe identifier, unique per tenant. Used in public-facing URLs.
 */
export declare class BranchEntity {
    id: string;
    /** Tenant isolation */
    tenantId: string;
    /** Display name — e.g. "Acme FC — Manchester" */
    name: string;
    /** URL-safe slug — unique per tenant */
    slug: string;
    /** Short description */
    description: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    county: string | null;
    postcode: string;
    /** ISO 3166-1 alpha-2 country code — e.g. 'GB', 'US', 'AE' */
    countryCode: string;
    /**
     * WGS-84 latitude — range -90.0 to +90.0
     * Precision 7 decimal places ≈ 1cm accuracy.
     */
    latitude: number | null;
    /**
     * WGS-84 longitude — range -180.0 to +180.0
     */
    longitude: number | null;
    /** Human-readable plus code or what3words address */
    geoLabel: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    /**
     * FK → users.id (same tenant).
     * NOT a database-level FK constraint (cross-table without FK in multi-tenant
     * pattern — enforced at service layer by UserRepository lookup).
     */
    managerUserId: string | null;
    status: BranchStatus;
    /**
     * JSONB 7-day weekly schedule.
     * Default: open Mon–Fri 09:00–17:00, closed Sat–Sun.
     */
    timings: WeeklyTimings;
    /** External map pin URL or embed link */
    mapUrl: string | null;
    /** Facility tags — e.g. ['parking', 'changing_rooms', 'cafe'] */
    facilities: string[] | null;
    /** Branch cover image URL */
    imageUrl: string | null;
    /** Sort order for display */
    sortOrder: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=branch.entity.d.ts.map