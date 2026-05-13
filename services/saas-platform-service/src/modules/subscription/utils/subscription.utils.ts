/**
 * SubscriptionUtils — stateless helpers for the subscription domain.
 * No side effects. No dependencies.
 */
export class SubscriptionUtils {
  /**
   * Builds tenant-namespaced Redis key for the subscription domain.
   * Pattern: tenant:{tenantId}:subscription:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:subscription:${suffix}`;
  }
}
