"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionEvents = void 0;
var SubscriptionEvents;
(function (SubscriptionEvents) {
    SubscriptionEvents["CREATED"] = "spancle.subscription.created";
    SubscriptionEvents["TRIAL_STARTED"] = "spancle.subscription.trial_started";
    SubscriptionEvents["ACTIVATED"] = "spancle.subscription.activated";
    SubscriptionEvents["PAST_DUE"] = "spancle.subscription.past_due";
    SubscriptionEvents["CANCELLED"] = "spancle.subscription.cancelled";
    SubscriptionEvents["EXPIRED"] = "spancle.subscription.expired";
    SubscriptionEvents["PAUSED"] = "spancle.subscription.paused";
    SubscriptionEvents["RESUMED"] = "spancle.subscription.resumed";
    SubscriptionEvents["RENEWED"] = "spancle.subscription.renewed";
})(SubscriptionEvents || (exports.SubscriptionEvents = SubscriptionEvents = {}));
//# sourceMappingURL=subscription.events.js.map