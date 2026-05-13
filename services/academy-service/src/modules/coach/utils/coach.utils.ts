/**
 * CoachUtils — stateless helpers for the coach domain.
 * No side effects. No dependencies.
 */
export class CoachUtils {
  /**
   * Builds tenant-namespaced Redis key for the coach domain.
   * Pattern: tenant:{tenantId}:coach:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:coach:${suffix}`;
  }
}
