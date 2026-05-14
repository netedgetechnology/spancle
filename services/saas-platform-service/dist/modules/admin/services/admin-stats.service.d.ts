import { DataSource } from 'typeorm';
import type { AdminStatsResponse } from '../dto/admin-stats.dto';
/**
 * AdminStatsService — computes cross-tenant aggregate statistics.
 *
 * Architecture notes:
 *   - All queries run directly against the database via raw SQL
 *     for performance. TypeORM ORM layer is too slow for aggregations
 *     across potentially thousands of tenants.
 *   - Sprint 1: booking and support ticket stats are stubs (return 0).
 *     Real values will come from event-driven Redis counters (Sprint 3)
 *     and a helpdesk API integration (Sprint 4).
 *   - Sprint 3: Add Redis caching with 5-minute TTL on stats response.
 *   - All monetary values are in minor units (pence/cents).
 *     Currency is hardcoded to GBP until multi-currency billing lands.
 */
export declare class AdminStatsService {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    getStats(periodDays?: number): Promise<AdminStatsResponse>;
    private getRecentTenants;
    private computeTenantStats;
    private computeTierBreakdown;
    private computeMonthlyTrend;
    /**
     * Computes detailed trial funnel statistics.
     *
     * Trial window assumption: 30 days — i.e. a trial tenant created > 30 days
     * ago and still on 'trial' status is overdue for conversion action.
     *
     * "Expiring soon" = trial tenants created 23–30 days ago (within 7 days
     * of the assumed 30-day window end).
     */
    private computeTrialStats;
    /**
     * Derives subscription statistics from the tenants table.
     *
     * "Paying subscriber" = active tenant on starter tier or above.
     * Free-tier tenants are excluded — they have no subscription value.
     *
     * This is a proxy until a dedicated billing/subscriptions schema exists.
     * All MRR values are 0 — billing integration is Sprint 3.
     */
    private computeSubscriptionStats;
}
//# sourceMappingURL=admin-stats.service.d.ts.map