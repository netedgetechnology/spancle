/**
 * AcademyUtils — stateless helpers for the academy domain.
 * No side effects. No dependencies.
 */
export class AcademyUtils {
  /**
   * Builds tenant-namespaced Redis key for the academy domain.
   * Pattern: tenant:{tenantId}:academy:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:academy:${suffix}`;
  }
}
