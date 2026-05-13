/**
 * TournamentUtils — stateless helpers for the tournament domain.
 * No side effects. No dependencies.
 */
export class TournamentUtils {
  /**
   * Builds tenant-namespaced Redis key for the tournament domain.
   * Pattern: tenant:{tenantId}:tournament:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:tournament:${suffix}`;
  }
}
