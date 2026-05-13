/**
 * NotificationUtils — stateless helpers for the notification domain.
 * No side effects. No dependencies.
 */
export class NotificationUtils {
  /**
   * Builds tenant-namespaced Redis key for the notification domain.
   * Pattern: tenant:{tenantId}:notification:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:notification:${suffix}`;
  }
}
