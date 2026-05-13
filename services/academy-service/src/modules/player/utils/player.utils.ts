/**
 * PlayerUtils — stateless helpers for the player domain.
 * No side effects. No dependencies.
 */
export class PlayerUtils {
  /**
   * Builds tenant-namespaced Redis key for the player domain.
   * Pattern: tenant:{tenantId}:player:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:player:${suffix}`;
  }
}
