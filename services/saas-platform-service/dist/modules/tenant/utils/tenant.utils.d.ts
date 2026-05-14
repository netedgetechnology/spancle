/**
 * TenantUtils — stateless helpers for the tenant domain.
 * No side effects. No dependencies.
 */
export declare class TenantUtils {
    /**
     * Builds tenant-namespaced Redis key for the tenant domain.
     * Pattern: tenant:{tenantId}:tenant:{suffix}
     */
    static redisKey(tenantId: string, suffix: string): string;
}
//# sourceMappingURL=tenant.utils.d.ts.map