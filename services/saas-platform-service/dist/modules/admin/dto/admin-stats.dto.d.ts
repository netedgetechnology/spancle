/**
 * AdminStatsDto — aggregated platform statistics for the superadmin dashboard.
 *
 * Returned by GET /api/v1/admin/stats
 * Consumed by the superadmin-portal dashboard widgets.
 *
 * Design notes:
 *   - All counts are integers; monetary values are in minor currency units (pence/cents)
 *   - `previousPeriod` values allow delta calculation in the frontend
 *   - `period` indicates the window used for "new this period" counts (default: 30 days)
 *   - Fields marked [STUB] are populated with placeholders pending service integration
 */
export interface TenantStats {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    terminated: number;
    pending: number;
    newThisPeriod: number;
    /** Previous period count for delta calculation */
    previousPeriod: number;
}
export interface TierCount {
    tier: string;
    count: number;
}
export interface RevenueStats {
    /** Monthly Recurring Revenue in minor units (e.g. pence) */
    mrrMinorUnits: number;
    /** Currency ISO-4217 code */
    currency: string;
    previousMrrMinorUnits: number;
    /** [STUB] Pending billing integration Sprint 3 */
    isStub: true;
}
export interface MonthlyDataPoint {
    /** ISO month label: "2025-01" */
    month: string;
    tenantCount: number;
    trialCount: number;
    /** [STUB] Revenue in minor units — 0 until billing integrated */
    revenueMinorUnits: number;
}
export interface BookingStats {
    totalThisPeriod: number;
    confirmedThisPeriod: number;
    cancelledThisPeriod: number;
    /** Cross-service aggregate — [STUB] Sprint 3 */
    isStub: true;
}
export interface SupportTicketStats {
    open: number;
    pending: number;
    resolved: number;
    /** [STUB] External helpdesk integration Sprint 4 */
    isStub: true;
}
export interface RecentTenant {
    id: string;
    name: string;
    slug: string;
    email: string;
    status: string;
    tier: string;
    createdAt: string;
}
export interface TrialAgeBucket {
    /** Human-readable label: "0–7 days", "8–14 days", "15–30 days", "30+ days" */
    label: string;
    count: number;
    /** Lower bound in days (inclusive) */
    minDays: number;
    /** Upper bound in days (inclusive, -1 = unbounded) */
    maxDays: number;
}
export interface TrialStats {
    /** Total tenants currently on trial status */
    total: number;
    /** Trials expiring within 7 days (assuming 30-day trial window) */
    expiringSoon: number;
    /** Trials that converted to active in the period window */
    convertedThisPeriod: number;
    /** Trials that expired (terminated) without converting in the period window */
    expiredThisPeriod: number;
    /**
     * Conversion rate = converted / (converted + expired) as a percentage.
     * null when denominator is 0.
     */
    conversionRatePct: number | null;
    /** Distribution of current trials by age */
    ageBuckets: TrialAgeBucket[];
}
export interface SubscriptionByTier {
    tier: string;
    count: number;
    /** Estimated MRR contribution in minor units — 0 until billing integrated */
    mrrMinorUnits: number;
}
export interface SubscriptionStats {
    /** Total paying subscribers (active tenants on starter tier or above) */
    totalPaying: number;
    /** Paying subscribers added this period */
    newThisPeriod: number;
    /** Paying subscribers lost (moved to suspended/terminated) this period */
    churnedThisPeriod: number;
    /**
     * Churn rate = churned / total as a percentage.
     * null when total is 0.
     */
    churnRatePct: number | null;
    /** Breakdown of paying subscribers by tier */
    byTier: SubscriptionByTier[];
    /**
     * isProxy: true — data is derived from tenant tier/status, not a
     * dedicated subscriptions table. Replace with billing service in Sprint 3.
     */
    isProxy: true;
}
export interface AdminStatsResponse {
    /** ISO-8601 timestamp when stats were computed */
    computedAt: string;
    /** Period window in days used for "this period" counts */
    periodDays: number;
    tenants: TenantStats;
    tierBreakdown: TierCount[];
    revenue: RevenueStats;
    monthlyTrend: MonthlyDataPoint[];
    bookings: BookingStats;
    supportTickets: SupportTicketStats;
    recentTenants: RecentTenant[];
    /** Detailed trial funnel statistics */
    trialStats: TrialStats;
    /** Subscription and paying customer statistics */
    subscriptionStats: SubscriptionStats;
}
//# sourceMappingURL=admin-stats.dto.d.ts.map