"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueUtils = void 0;
/**
 * VenueUtils — stateless helpers for the venue domain.
 * No side effects. No dependencies.
 */
class VenueUtils {
    /**
     * Builds tenant-namespaced Redis key for the venue domain.
     * Pattern: tenant:{tenantId}:venue:{suffix}
     */
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:venue:${suffix}`;
    }
}
exports.VenueUtils = VenueUtils;
//# sourceMappingURL=venue.utils.js.map