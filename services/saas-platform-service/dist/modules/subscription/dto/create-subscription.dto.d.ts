declare const BILLING_CYCLES: readonly ["monthly", "annual", "one_time", "custom"];
export declare class CreateSubscriptionDto {
    packageId: string;
    billingCycle?: typeof BILLING_CYCLES[number];
}
export declare class CancelSubscriptionDto {
    reason: string;
}
export declare class ActivateSubscriptionDto {
    externalSubId?: string;
}
export {};
//# sourceMappingURL=create-subscription.dto.d.ts.map