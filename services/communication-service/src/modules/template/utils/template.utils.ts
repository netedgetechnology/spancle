/**
 * TemplateUtils — stateless helpers for the template domain.
 * No side effects. No dependencies.
 */
export class TemplateUtils {
  /**
   * Builds tenant-namespaced Redis key for the template domain.
   * Pattern: tenant:{tenantId}:template:{suffix}
   */
  static redisKey(tenantId: string, suffix: string): string {
    return `tenant:${tenantId}:template:${suffix}`;
  }
}
