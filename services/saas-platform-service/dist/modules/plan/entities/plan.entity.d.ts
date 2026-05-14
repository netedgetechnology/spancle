/**
 * PlanEntity — the resolved plan assignment for a specific tenant.
 *
 * Links: Tenant → Package (via tierKey) with optional per-tenant limit overrides.
 *
 * One active plan per tenant. Created automatically when a subscription is activated.
 * Limit overrides allow enterprise-tier custom agreements (e.g. 10,000 users).
 */
export declare class PlanEntity {
    id: string;
    tenantId: string;
    packageId: string;
    tierKey: string;
    /**
     * Per-tenant feature flag overrides — merged ON TOP of package features.
     * Empty object = use package defaults exactly.
     */
    featureOverrides: Record<string, boolean>;
    /**
     * Per-tenant resource limit overrides — merged ON TOP of package limits.
     * Allows enterprise tenants to have custom limits (e.g. 10,000 users).
     * -1 = unlimited override.
     */
    limitOverrides: Record<string, number>;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=plan.entity.d.ts.map