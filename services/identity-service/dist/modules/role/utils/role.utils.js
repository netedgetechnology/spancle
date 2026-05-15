"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleUtils = void 0;
class RoleUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:role:${suffix}`;
    }
}
exports.RoleUtils = RoleUtils;
//# sourceMappingURL=role.utils.js.map