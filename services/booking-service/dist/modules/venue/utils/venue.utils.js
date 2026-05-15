"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueUtils = void 0;
class VenueUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:venue:${suffix}`;
    }
}
exports.VenueUtils = VenueUtils;
//# sourceMappingURL=venue.utils.js.map