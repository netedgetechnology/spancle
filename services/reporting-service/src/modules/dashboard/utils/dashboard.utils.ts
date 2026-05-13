/**
 * DashboardUtils — stateless helpers for the dashboard domain.
 * No side effects. No dependencies.
 */
export class DashboardUtils {
  /**
   * Builds tenant-namespaced Redis key for the dashboard domain.
   * Pattern: tenant:{tenantId}:dashboard:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:dashboard:${suffix}`;
  }
}
