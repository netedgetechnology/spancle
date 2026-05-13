/**
 * PaymentUtils — stateless helpers for the payment domain.
 * No side effects. No dependencies.
 */
export class PaymentUtils {
  /**
   * Builds tenant-namespaced Redis key for the payment domain.
   * Pattern: tenant:{tenantId}:payment:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:payment:${suffix}`;
  }
}
