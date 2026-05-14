/**
 * Local copy of per-tier default plan limits for saas-platform-service.
 * Source of truth lives in identity-service plan-limits.types — keep in sync.
 * -1 = unlimited (Enterprise tier)
 */
export interface PlanResourceLimits {
    maxUsers: number;
    maxStorageGb: number;
    maxApiCallsPerDay: number;
    maxConcurrentBookings: number;
    maxActiveTournaments: number;
    maxAcademies: number;
    maxPlayersPerAcademy: number;
    maxNotificationsPerDay: number;
    maxReportsPerDay: number;
}
export interface PlanFeatureFlags {
    customBranding: boolean;
    advancedAnalytics: boolean;
    apiAccess: boolean;
    webhooks: boolean;
    multiAcademy: boolean;
    prioritySupport: boolean;
    auditLogAccess: boolean;
    customRoles: boolean;
    dataExport: boolean;
    ssoIntegration: boolean;
}
export interface PlanLimits {
    tier: string;
    resources: PlanResourceLimits;
    features: PlanFeatureFlags;
}
export declare const DEFAULT_PLAN_LIMITS: Record<string, PlanLimits>;
//# sourceMappingURL=plan-limits.constants.d.ts.map