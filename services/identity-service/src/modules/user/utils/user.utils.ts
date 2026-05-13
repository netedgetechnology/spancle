/**
 * UserUtils — stateless helpers for the user domain.
 * No side effects. No dependencies.
 */
export class UserUtils {
  /**
   * Builds tenant-namespaced Redis key for the user domain.
   * Pattern: tenant:{tenantId}:user:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:user:${suffix}`;
  }
}
