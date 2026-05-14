/**
 * Subscription lifecycle state machine:
 *   trialing  → Trial period, no payment required
 *   active    → Paid and in good standing
 *   past_due  → Payment failed, grace period
 *   cancelled → Cancelled by tenant (access until periodEnd)
 *   expired   → Trial ended without conversion OR past_due resolved by expiry
 *   paused    → Temporarily suspended by admin
 */
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | 'expired' | 'paused';
export type SubscriptionBillingCycle = 'monthly' | 'annual' | 'one_time' | 'custom';
/**
 * SubscriptionEntity — a tenant's subscription to a Package.
 *
 * One active subscription per tenant at any time.
 * Historical subscriptions are kept (is_deleted = false, status = cancelled/expired).
 *
 * Lifecycle:
 *   new tenant → trialing (if trialDays > 0) or active (free tier)
 *   trial ends → active (if payment provided) or expired (no payment)
 *   active     → cancelled (by tenant request)
 *   active     → past_due (payment failure)
 *   past_due   → active (payment recovered) or expired (grace period lapsed)
 */
export declare class SubscriptionEntity {
    id: string;
    tenantId: string;
    /** FK to package_definitions.id */
    packageId: string;
    /** Snapshot of package.tierKey at subscription time */
    tierKey: string;
    status: SubscriptionStatus;
    billingCycle: SubscriptionBillingCycle;
    /** Price paid in minor units — snapshot at subscription time */
    priceMinorUnits: number;
    currency: string;
    /** Start of current billing period */
    periodStart: Date;
    /** End of current billing period — next renewal date */
    periodEnd: Date;
    /** When the trial ends (null if no trial) */
    trialEnd: Date | null;
    /** When this subscription was cancelled */
    cancelledAt: Date | null;
    /** Reason for cancellation */
    cancelReason: string | null;
    /**
     * Feature flags snapshot — copied from package.features at subscribe time.
     * Ensures existing subscriptions are unaffected by package updates.
     */
    featuresSnapshot: Record<string, boolean>;
    /**
     * Resource limits snapshot — copied from package.limits at subscribe time.
     */
    limitsSnapshot: Record<string, number>;
    /** External payment provider subscription ID (Stripe, etc.) — Sprint 3 */
    externalSubId: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=subscription.entity.d.ts.map