"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUtils = void 0;
/**
 * UserUtils — stateless helpers for the user domain.
 * No side effects. No dependencies.
 */
class UserUtils {
    /**
     * Builds tenant-namespaced Redis key for the user domain.
     * Pattern: tenant:{tenantId}:user:{suffix}
     */
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:user:${suffix}`;
    }
}
exports.UserUtils = UserUtils;
//# sourceMappingURL=user.utils.js.map