/**
 * Tenant Constants
 * Multi-tenancy configuration and limits.
 */
export declare const TENANT_HEADER: "x-tenant-id";
export declare const TENANT_RESOLUTION_STRATEGIES: {
    readonly HEADER: "header";
    readonly SUBDOMAIN: "subdomain";
    readonly PATH: "path";
    readonly JWT: "jwt";
};
export type TenantResolutionStrategy = typeof TENANT_RESOLUTION_STRATEGIES[keyof typeof TENANT_RESOLUTION_STRATEGIES];
export declare const TENANT_STATUS: {
    readonly PENDING: "pending";
    readonly ACTIVE: "active";
    readonly SUSPENDED: "suspended";
    readonly TERMINATED: "terminated";
    readonly TRIAL: "trial";
};
export type TenantStatus = typeof TENANT_STATUS[keyof typeof TENANT_STATUS];
export declare const TENANT_TIERS: {
    readonly FREE: "free";
    readonly STARTER: "starter";
    readonly GROWTH: "growth";
    readonly PRO: "pro";
    readonly ENTERPRISE: "enterprise";
};
export type TenantTier = typeof TENANT_TIERS[keyof typeof TENANT_TIERS];
export declare const TENANT_LIMITS: {
    readonly free: {
        readonly users: 5;
        readonly storage_gb: 1;
        readonly api_calls_per_day: 1000;
    };
    readonly starter: {
        readonly users: 25;
        readonly storage_gb: 10;
        readonly api_calls_per_day: 10000;
    };
    readonly growth: {
        readonly users: 100;
        readonly storage_gb: 50;
        readonly api_calls_per_day: 50000;
    };
    readonly pro: {
        readonly users: 500;
        readonly storage_gb: 200;
        readonly api_calls_per_day: 200000;
    };
    readonly enterprise: {
        readonly users: -1;
        readonly storage_gb: -1;
        readonly api_calls_per_day: -1;
    };
};
//# sourceMappingURL=tenant.constants.d.ts.map