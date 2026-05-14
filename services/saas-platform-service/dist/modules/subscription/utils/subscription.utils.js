"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionUtils = void 0;
/**
 * SubscriptionUtils — stateless helpers for the subscription domain.
 * No side effects. No dependencies.
 */
class SubscriptionUtils {
    /**
     * Builds tenant-namespaced Redis key for the subscription domain.
     * Pattern: tenant:{tenantId}:subscription:{suffix}
     */
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:subscription:${suffix}`;
    }
}
exports.SubscriptionUtils = SubscriptionUtils;
//# sourceMappingURL=subscription.utils.js.map