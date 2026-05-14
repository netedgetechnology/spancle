"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleUtils = void 0;
/**
 * RoleUtils — stateless helpers for the role domain.
 * No side effects. No dependencies.
 */
class RoleUtils {
    /**
     * Builds tenant-namespaced Redis key for the role domain.
     * Pattern: tenant:{tenantId}:role:{suffix}
     */
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:role:${suffix}`;
    }
}
exports.RoleUtils = RoleUtils;
//# sourceMappingURL=role.utils.js.map