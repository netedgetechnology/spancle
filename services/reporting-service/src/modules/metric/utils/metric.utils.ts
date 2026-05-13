/**
 * MetricUtils — stateless helpers for the metric domain.
 * No side effects. No dependencies.
 */
export class MetricUtils {
  /**
   * Builds tenant-namespaced Redis key for the metric domain.
   * Pattern: tenant:{tenantId}:metric:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:metric:${suffix}`;
  }
}
