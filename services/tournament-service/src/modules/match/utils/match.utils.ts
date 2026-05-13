/**
 * MatchUtils — stateless helpers for the match domain.
 * No side effects. No dependencies.
 */
export class MatchUtils {
  /**
   * Builds tenant-namespaced Redis key for the match domain.
   * Pattern: tenant:{tenantId}:match:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:match:${suffix}`;
  }
}
