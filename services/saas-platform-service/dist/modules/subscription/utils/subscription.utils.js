"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionUtils = void 0;
class SubscriptionUtils {
    static redisKey(tenantId, suffix) {
        return `tenant:${tenantId}:subscription:${suffix}`;
    }
}
exports.SubscriptionUtils = SubscriptionUtils;
//# sourceMappingURL=subscription.utils.js.map