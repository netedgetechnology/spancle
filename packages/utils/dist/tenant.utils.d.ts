/**
 * Tenant utility helpers — used by both backend services and frontend apps.
 */
/**
 * Extracts tenant slug from a hostname.
 * acme.app.spancle.io -> 'acme'
 * app.spancle.io -> null
 */
export declare function extractTenantSlug(hostname: string, baseDomain: string): string | null;
/**
 * Builds a tenant-namespaced Redis key.
 * Pattern: spancle:{tenantId}:{domain}:{id}
 */
export declare function tenantRedisKey(tenantId: string, domain: string, id: string): string;
/**
 * Type guard — asserts tenantId is present on a request-like object.
 */
export declare function hasTenantId(obj: unknown): obj is {
    tenantId: string;
};
//# sourceMappingURL=tenant.utils.d.ts.map