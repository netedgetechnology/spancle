"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantUtils = void 0;
/**
 * TenantUtils — stateless helpers for the tenant domain.
 * No side effects. No dependencies.
 */
class TenantUtils {
    /**
     * Builds tenant-namespaced Redis key for the tenant domain.
     * Pattern: tenant:{tenantId}:tenant:{suffix}
     */
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:tenant:${suffix}`;
    }
}
exports.TenantUtils = TenantUtils;
//# sourceMappingURL=tenant.utils.js.map