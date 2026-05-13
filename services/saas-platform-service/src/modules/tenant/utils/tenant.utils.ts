/**
 * TenantUtils — stateless helpers for the tenant domain.
 * No side effects. No dependencies.
 */
export class TenantUtils {
  /**
   * Builds tenant-namespaced Redis key for the tenant domain.
   * Pattern: tenant:{tenantId}:tenant:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:tenant:${suffix}`;
  }
}
