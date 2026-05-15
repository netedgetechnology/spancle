"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserUtils = void 0;
class UserUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:user:${suffix}`;
    }
}
exports.UserUtils = UserUtils;
//# sourceMappingURL=user.utils.js.map