export declare class PackageFeaturesDto {
    customBranding?: boolean;
    advancedAnalytics?: boolean;
    apiAccess?: boolean;
    webhooks?: boolean;
    multiAcademy?: boolean;
    prioritySupport?: boolean;
    auditLogAccess?: boolean;
    customRoles?: boolean;
    dataExport?: boolean;
    ssoIntegration?: boolean;
}
export declare class PackageLimitsDto {
    maxUsers?: number;
    maxStorageGb?: number;
    maxApiCallsPerDay?: number;
    maxConcurrentBookings?: number;
    maxActiveTournaments?: number;
    maxAcademies?: number;
    maxPlayersPerAcademy?: number;
    maxNotificationsPerDay?: number;
    maxReportsPerDay?: number;
}
declare const TIER_KEYS: readonly ["free", "starter", "growth", "pro", "enterprise"];
declare const STATUSES: readonly ["draft", "active", "deprecated", "archived"];
export declare class CreatePackageDto {
    name: string;
    slug: string;
    description?: string;
    tierKey: typeof TIER_KEYS[number];
    status?: typeof STATUSES[number];
    priceMonthlyMinorUnits?: number;
    priceAnnualMinorUnits?: number;
    currency?: string;
    trialDays?: number;
    features?: PackageFeaturesDto;
    limits?: PackageLimitsDto;
    highlightFeatures?: string[];
    badgeText?: string;
    isHighlighted?: boolean;
    sortOrder?: number;
    metadata?: Record<string, unknown>;
}
export declare class UpdatePackageDto {
    name?: string;
    description?: string;
    status?: typeof STATUSES[number];
    priceMonthlyMinorUnits?: number;
    priceAnnualMinorUnits?: number;
    currency?: string;
    trialDays?: number;
    features?: PackageFeaturesDto;
    limits?: PackageLimitsDto;
    highlightFeatures?: string[];
    badgeText?: string;
    isHighlighted?: boolean;
    sortOrder?: number;
    metadata?: Record<string, unknown>;
}
export {};
//# sourceMappingURL=create-package.dto.d.ts.map