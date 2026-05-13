/**
 * PlanUtils — stateless helpers for the plan domain.
 * No side effects. No dependencies.
 */
export class PlanUtils {
  /**
   * Builds tenant-namespaced Redis key for the plan domain.
   * Pattern: tenant:{tenantId}:plan:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:plan:${suffix}`;
  }
}
