/**
 * Package status lifecycle:
 *   draft     → created but not visible to tenants
 *   active    → visible and subscribable
 *   deprecated → no new subscriptions; existing subscriptions continue
 *   archived  → fully hidden; used for historical record
 */
export type PackageStatus = 'draft' | 'active' | 'deprecated' | 'archived';
/**
 * Billing cycle options for a package.
 */
export type BillingCycle = 'monthly' | 'annual' | 'one_time' | 'custom';
/**
 * PackageEntity — a platform-level product offering.
 *
 * NOT tenant-scoped — packages are global platform definitions
 * created by superadmins and subscribed to by tenants.
 * Table: `package_definitions` (avoids collision with PostgreSQL reserved word)
 *
 * Architecture:
 *   - `features` JSONB: typed feature flag booleans (mirrors PlanFeatureFlags)
 *   - `limits` JSONB:   typed resource limits (mirrors PlanResourceLimits)
 *   - `metadata` JSONB: arbitrary display/marketing data
 *   - `tierKey`: links to identity-service TenantTier enum (free/starter/etc.)
 *     When a tenant subscribes, their tenant.tier is set to this value.
 *
 * Pricing:
 *   - `priceMonthlyMinorUnits` in minor currency units (pence/cents)
 *   - `priceAnnualMinorUnits`  (annual price, typically discounted)
 *   - `currency` ISO-4217
 *   - `trialDays` — how many days the free trial lasts (0 = no trial)
 */
export declare class PackageEntity {
    id: string;
    /** URL-safe slug used in API paths and frontend routing */
    slug: string;
    /** Display name shown to tenants — e.g. "Pro", "Growth Plan" */
    name: string;
    /** Short marketing description shown in pricing page */
    description: string | null;
    /**
     * Links to identity-service TenantTier.
     * Values: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'
     * Unique — one package definition per tier.
     */
    tierKey: string;
    status: PackageStatus;
    /** Monthly price in minor currency units (e.g. 2900 = £29.00) */
    priceMonthlyMinorUnits: number;
    /** Annual price in minor currency units — usually discounted */
    priceAnnualMinorUnits: number;
    /** ISO-4217 currency code — e.g. 'GBP', 'USD', 'EUR' */
    currency: string;
    /** Number of trial days (0 = no trial) */
    trialDays: number;
    /**
     * JSONB feature flags — typed object matching PlanFeatureFlags interface.
     * These are enforced at runtime by PlanLimitGuard + plan-limits.types.ts.
     *
     * Default: all false (populated by PackageService.seedDefaults on creation).
     */
    features: Record<string, boolean>;
    /**
     * JSONB resource limits — typed object matching PlanResourceLimits interface.
     * -1 = unlimited (Enterprise tier).
     *
     * Default: empty object (populated by PackageService.seedDefaults).
     */
    limits: Record<string, number>;
    /** Highlighted feature bullets shown on pricing page (max 6) */
    highlightFeatures: string[] | null;
    /** Badge text — e.g. "Most Popular", "Best Value" */
    badgeText: string | null;
    /** Whether to visually highlight this package in pricing grids */
    isHighlighted: boolean;
    /** Sort order in pricing page display */
    sortOrder: number;
    /** Arbitrary metadata for marketing / display use */
    metadata: Record<string, unknown> | null;
    /** When this package was made publicly available */
    publishedAt: Date | null;
    /** When this package was deprecated (no new subscriptions) */
    deprecatedAt: Date | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=package.entity.d.ts.map