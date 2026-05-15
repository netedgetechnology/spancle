"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantUtils = void 0;
class TenantUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:tenant:${suffix}`;
    }
}
exports.TenantUtils = TenantUtils;
//# sourceMappingURL=tenant.utils.js.map