/**
 * UserUtils — stateless helpers for the user domain.
 * No side effects. No dependencies.
 */
export declare class UserUtils {
    /**
     * Builds tenant-namespaced Redis key for the user domain.
     * Pattern: tenant:{tenantId}:user:{suffix}
     */
    static redisKey(tenantId: string, suffix: string): string;
}
//# sourceMappingURL=user.utils.d.ts.map