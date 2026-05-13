/**
 * MessageUtils — stateless helpers for the message domain.
 * No side effects. No dependencies.
 */
export class MessageUtils {
  /**
   * Builds tenant-namespaced Redis key for the message domain.
   * Pattern: tenant:{tenantId}:message:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:message:${suffix}`;
  }
}
