"use strict";
/**
 * Tenant Constants
 * Multi-tenancy configuration and limits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_LIMITS = exports.TENANT_TIERS = exports.TENANT_STATUS = exports.TENANT_RESOLUTION_STRATEGIES = exports.TENANT_HEADER = void 0;
exports.TENANT_HEADER = 'x-tenant-id';
exports.TENANT_RESOLUTION_STRATEGIES = {
    HEADER: 'header',
    SUBDOMAIN: 'subdomain',
    PATH: 'path',
    JWT: 'jwt',
};
exports.TENANT_STATUS = {
    PENDING: 'pending',
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    TERMINATED: 'terminated',
    TRIAL: 'trial',
};
exports.TENANT_TIERS = {
    FREE: 'free',
    STARTER: 'starter',
    GROWTH: 'growth',
    PRO: 'pro',
    ENTERPRISE: 'enterprise',
};
exports.TENANT_LIMITS = {
    [exports.TENANT_TIERS.FREE]: { users: 5, storage_gb: 1, api_calls_per_day: 1_000 },
    [exports.TENANT_TIERS.STARTER]: { users: 25, storage_gb: 10, api_calls_per_day: 10_000 },
    [exports.TENANT_TIERS.GROWTH]: { users: 100, storage_gb: 50, api_calls_per_day: 50_000 },
    [exports.TENANT_TIERS.PRO]: { users: 500, storage_gb: 200, api_calls_per_day: 200_000 },
    [exports.TENANT_TIERS.ENTERPRISE]: { users: -1, storage_gb: -1, api_calls_per_day: -1 }, // -1 = unlimited
};
//# sourceMappingURL=tenant.constants.js.map