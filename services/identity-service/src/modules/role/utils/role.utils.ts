/**
 * RoleUtils — stateless helpers for the role domain.
 * No side effects. No dependencies.
 */
export class RoleUtils {
  /**
   * Builds tenant-namespaced Redis key for the role domain.
   * Pattern: tenant:{tenantId}:role:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:role:${suffix}`;
  }
}
