/**
 * ReportUtils — stateless helpers for the report domain.
 * No side effects. No dependencies.
 */
export class ReportUtils {
  /**
   * Builds tenant-namespaced Redis key for the report domain.
   * Pattern: tenant:{tenantId}:report:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:report:${suffix}`;
  }
}
