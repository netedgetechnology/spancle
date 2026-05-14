/**
 * plan-limits.types.ts
 *
 * Type contracts for tier-based plan restrictions.
 * Consumed by PlanLimitGuard, PlanRestrictionMiddleware, and TenantContextRuntime.
 *
 * -1 = unlimited (Enterprise tier)
 */
export interface PlanResourceLimits {
    /** Maximum number of active users (-1 = unlimited) */
    maxUsers: number;
    /** Maximum storage in gigabytes (-1 = unlimited) */
    maxStorageGb: number;
    /** Maximum API calls per day (-1 = unlimited) */
    maxApiCallsPerDay: number;
    /** Maximum concurrent bookings per tenant */
    maxConcurrentBookings: number;
    /** Maximum active tournaments at once */
    maxActiveTournaments: number;
    /** Maximum academies within tenant */
    maxAcademies: number;
    /** Maximum player registrations per academy */
    maxPlayersPerAcademy: number;
    /** Maximum notification sends per day */
    maxNotificationsPerDay: number;
    /** Maximum report generations per day */
    maxReportsPerDay: number;
}
export interface PlanFeatureFlags {
    /** Custom branding and white-labelling */
    customBranding: boolean;
    /** Advanced analytics and custom dashboards */
    advancedAnalytics: boolean;
    /** API access (external SDK) */
    apiAccess: boolean;
    /** Webhook support */
    webhooks: boolean;
    /** Multi-academy management */
    multiAcademy: boolean;
    /** Priority support channel */
    prioritySupport: boolean;
    /** Audit log access via UI */
    auditLogAccess: boolean;
    /** Custom role definitions beyond system roles */
    customRoles: boolean;
    /** Export data (CSV/PDF/XLSX) */
    dataExport: boolean;
    /** SSO / SAML integration */
    ssoIntegration: boolean;
}
export interface PlanLimits {
    tier: string;
    resources: PlanResourceLimits;
    features: PlanFeatureFlags;
}
/** Per-tier default limits — authoritative source for enforcement */
export declare const DEFAULT_PLAN_LIMITS: Record<string, PlanLimits>;
//# sourceMappingURL=plan-limits.types.d.ts.map