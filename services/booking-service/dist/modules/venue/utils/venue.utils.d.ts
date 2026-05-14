/**
 * VenueUtils — stateless helpers for the venue domain.
 * No side effects. No dependencies.
 */
export declare class VenueUtils {
    /**
     * Builds tenant-namespaced Redis key for the venue domain.
     * Pattern: tenant:{tenantId}:venue:{suffix}
     */
    static redisKey(tenantId: string, suffix: string): string;
}
//# sourceMappingURL=venue.utils.d.ts.map