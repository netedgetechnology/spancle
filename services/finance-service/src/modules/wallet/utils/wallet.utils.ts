/**
 * WalletUtils — stateless helpers for the wallet domain.
 * No side effects. No dependencies.
 */
export class WalletUtils {
  /**
   * Builds tenant-namespaced Redis key for the wallet domain.
   * Pattern: tenant:{tenantId}:wallet:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:wallet:${suffix}`;
  }
}
