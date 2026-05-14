declare const STATUSES: readonly ["trialing", "active", "past_due", "cancelled", "expired", "paused"];
export declare class UpdateSubscriptionDto {
    status?: typeof STATUSES[number];
    externalSubId?: string;
}
export {};
//# sourceMappingURL=update-subscription.dto.d.ts.map