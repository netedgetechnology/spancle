"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanUtils = void 0;
/**
 * PlanUtils — stateless helpers for the plan domain.
 * No side effects. No dependencies.
 */
class PlanUtils {
    /**
     * Builds tenant-namespaced Redis key for the plan domain.
     * Pattern: tenant:{tenantId}:plan:{suffix}
     */
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:plan:${suffix}`;
    }
}
exports.PlanUtils = PlanUtils;
//# sourceMappingURL=plan.utils.js.map