"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanUtils = void 0;
class PlanUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:plan:${suffix}`;
    }
}
exports.PlanUtils = PlanUtils;
//# sourceMappingURL=plan.utils.js.map