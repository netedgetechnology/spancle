/**
 * BracketUtils — stateless helpers for the bracket domain.
 * No side effects. No dependencies.
 */
export class BracketUtils {
  /**
   * Builds tenant-namespaced Redis key for the bracket domain.
   * Pattern: tenant:{tenantId}:bracket:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:bracket:${suffix}`;
  }
}
