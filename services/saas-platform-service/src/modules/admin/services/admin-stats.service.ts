import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  AdminStatsResponse,
  TenantStats,
  TierCount,
  MonthlyDataPoint,
  RecentTenant,
  TrialStats,
  TrialAgeBucket,
  SubscriptionStats,
  SubscriptionByTier,
} from '../dto/admin-stats.dto';

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
@Injectable()
export class AdminStatsService {
  private readonly logger = new Logger(AdminStatsService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async getStats(periodDays = 30): Promise<AdminStatsResponse> {
    const computedAt = new Date().toISOString();

    const [
      tenantStats,
      tierBreakdown,
      monthlyTrend,
      recentTenants,
      trialStats,
      subscriptionStats,
    ] = await Promise.all([
      this.computeTenantStats(periodDays),
      this.computeTierBreakdown(),
      this.computeMonthlyTrend(6),
      this.getRecentTenants(10),
      this.computeTrialStats(periodDays),
      this.computeSubscriptionStats(periodDays),
    ]);

    return {
      computedAt,
      periodDays,
      tenants:           tenantStats,
      tierBreakdown,
      monthlyTrend,
      recentTenants,
      trialStats,
      subscriptionStats,

      revenue: {
        mrrMinorUnits:         0,
        currency:              'GBP',
        previousMrrMinorUnits: 0,
        isStub:                true,
      },

      // Sprint 3: cross-service booking counters via Redis
      bookings: {
        totalThisPeriod:     0,
        confirmedThisPeriod: 0,
        cancelledThisPeriod: 0,
        isStub:              true,
      },

      // Sprint 4: helpdesk API integration
      supportTickets: {
        open:     0,
        pending:  0,
        resolved: 0,
        isStub:   true,
      },
    };
  }

  // ── Tenant aggregation ─────────────────────────────────────────────────────


  // ── Recent tenants ────────────────────────────────────────────────────────────

  private async getRecentTenants(limit: number): Promise<RecentTenant[]> {
    const rows = await this.dataSource.query<RecentTenant[]>(
      `SELECT id, name, slug, email, status, tier,
              to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "createdAt"
         FROM tenants
        WHERE is_deleted = false
        ORDER BY created_at DESC
        LIMIT $1`,
      [limit],
    );
    return rows;
  }

  private async computeTenantStats(periodDays: number): Promise<TenantStats> {
    const [statusCounts, periodCounts] = await Promise.all([
      this.dataSource.query<Array<{ status: string; count: string }>>(
        `SELECT status, COUNT(*)::int AS count
         FROM tenants
         WHERE is_deleted = false
         GROUP BY status`,
      ),

      this.dataSource.query<Array<{ period: string; count: string }>>(
        `SELECT
           CASE WHEN created_at >= NOW() - INTERVAL '${periodDays} days'
                THEN 'current' ELSE 'previous'
           END AS period,
           COUNT(*)::int AS count
         FROM tenants
         WHERE is_deleted = false
           AND created_at >= NOW() - INTERVAL '${periodDays * 2} days'
         GROUP BY 1`,
      ),
    ]);

    const byStatus = Object.fromEntries(
      statusCounts.map((r) => [r.status, Number(r.count)]),
    );

    const current  = periodCounts.find((r) => r.period === 'current');
    const previous = periodCounts.find((r) => r.period === 'previous');

    const total =
      (byStatus['active']     ?? 0) +
      (byStatus['trial']      ?? 0) +
      (byStatus['suspended']  ?? 0) +
      (byStatus['terminated'] ?? 0) +
      (byStatus['pending']    ?? 0);

    return {
      total,
      active:         byStatus['active']     ?? 0,
      trial:          byStatus['trial']      ?? 0,
      suspended:      byStatus['suspended']  ?? 0,
      terminated:     byStatus['terminated'] ?? 0,
      pending:        byStatus['pending']    ?? 0,
      newThisPeriod:  Number(current?.count  ?? 0),
      previousPeriod: Number(previous?.count ?? 0),
    };
  }

  // ── Tier breakdown ─────────────────────────────────────────────────────────

  private async computeTierBreakdown(): Promise<TierCount[]> {
    const rows = await this.dataSource.query<Array<{ tier: string; count: string }>>(
      `SELECT tier, COUNT(*)::int AS count
       FROM tenants
       WHERE is_deleted = false AND status NOT IN ('terminated')
       GROUP BY tier
       ORDER BY count DESC`,
    );

    return rows.map((r) => ({ tier: r.tier, count: Number(r.count) }));
  }

  // ── Monthly trend (last N months) ─────────────────────────────────────────

  private async computeMonthlyTrend(months: number): Promise<MonthlyDataPoint[]> {
    const rows = await this.dataSource.query<Array<{
      month: string;
      tenant_count: string;
      trial_count:  string;
    }>>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
         COUNT(*)::int                                         AS tenant_count,
         COUNT(*) FILTER (WHERE status = 'trial')::int        AS trial_count
       FROM tenants
       WHERE is_deleted = false
         AND created_at >= DATE_TRUNC('month', NOW() - INTERVAL '${months - 1} months')
       GROUP BY 1
       ORDER BY 1`,
    );

    return rows.map((r) => ({
      month:             r.month,
      tenantCount:       Number(r.tenant_count),
      trialCount:        Number(r.trial_count),
      revenueMinorUnits: 0,   // Sprint 3: billing event aggregate
    }));
  }

  // ── Trial statistics ───────────────────────────────────────────────────────

  /**
   * Computes detailed trial funnel statistics.
   *
   * Trial window assumption: 30 days — i.e. a trial tenant created > 30 days
   * ago and still on 'trial' status is overdue for conversion action.
   *
   * "Expiring soon" = trial tenants created 23–30 days ago (within 7 days
   * of the assumed 30-day window end).
   */
  private async computeTrialStats(periodDays: number): Promise<TrialStats> {
    const [currentTrials, periodConversions, ageBucketRows] = await Promise.all([

      // Total current trials + expiring-soon count
      this.dataSource.query<Array<{
        total:         string;
        expiring_soon: string;
      }>>(
        `SELECT
           COUNT(*)::int                                                    AS total,
           COUNT(*) FILTER (
             WHERE created_at <= NOW() - INTERVAL '23 days'
               AND created_at >= NOW() - INTERVAL '30 days'
           )::int                                                           AS expiring_soon
         FROM tenants
         WHERE status = 'trial' AND is_deleted = false`,
      ),

      // Conversions and expirations within the period window
      this.dataSource.query<Array<{
        converted: string;
        expired:   string;
      }>>(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'active')::int   AS converted,
           COUNT(*) FILTER (WHERE status = 'terminated')::int AS expired
         FROM tenants
         WHERE is_deleted = false
           AND updated_at >= NOW() - INTERVAL '${periodDays} days'
           AND (status = 'active' OR status = 'terminated')`,
      ),

      // Age bucket distribution for current trials
      this.dataSource.query<Array<{
        bucket:  string;
        count:   string;
        min_days: number;
        max_days: number;
      }>>(
        `SELECT
           CASE
             WHEN created_at >= NOW() - INTERVAL '7 days'  THEN '0–7 days'
             WHEN created_at >= NOW() - INTERVAL '14 days' THEN '8–14 days'
             WHEN created_at >= NOW() - INTERVAL '30 days' THEN '15–30 days'
             ELSE '30+ days'
           END                                             AS bucket,
           COUNT(*)::int                                   AS count,
           CASE
             WHEN created_at >= NOW() - INTERVAL '7 days'  THEN 0
             WHEN created_at >= NOW() - INTERVAL '14 days' THEN 8
             WHEN created_at >= NOW() - INTERVAL '30 days' THEN 15
             ELSE 31
           END                                             AS min_days,
           CASE
             WHEN created_at >= NOW() - INTERVAL '7 days'  THEN 7
             WHEN created_at >= NOW() - INTERVAL '14 days' THEN 14
             WHEN created_at >= NOW() - INTERVAL '30 days' THEN 30
             ELSE -1
           END                                             AS max_days
         FROM tenants
         WHERE status = 'trial' AND is_deleted = false
         GROUP BY 1, 3, 4
         ORDER BY 3`,
      ),
    ]);

    const total        = Number(currentTrials[0]?.total        ?? 0);
    const expiringSoon = Number(currentTrials[0]?.expiring_soon ?? 0);
    const converted    = Number(periodConversions[0]?.converted ?? 0);
    const expired      = Number(periodConversions[0]?.expired   ?? 0);
    const denominator  = converted + expired;

    const ageBuckets: TrialAgeBucket[] = ageBucketRows.map((r) => ({
      label:   r.bucket,
      count:   Number(r.count),
      minDays: r.min_days,
      maxDays: r.max_days,
    }));

    return {
      total,
      expiringSoon,
      convertedThisPeriod:  converted,
      expiredThisPeriod:    expired,
      conversionRatePct:    denominator > 0
        ? Math.round((converted / denominator) * 100)
        : null,
      ageBuckets,
    };
  }

  // ── Subscription statistics ────────────────────────────────────────────────

  /**
   * Derives subscription statistics from the tenants table.
   *
   * "Paying subscriber" = active tenant on starter tier or above.
   * Free-tier tenants are excluded — they have no subscription value.
   *
   * This is a proxy until a dedicated billing/subscriptions schema exists.
   * All MRR values are 0 — billing integration is Sprint 3.
   */
  private async computeSubscriptionStats(periodDays: number): Promise<SubscriptionStats> {
    const PAYING_TIERS = `('starter', 'growth', 'pro', 'enterprise')`;

    const [totals, periodChanges, tierRows] = await Promise.all([

      // Current paying subscriber totals
      this.dataSource.query<Array<{ total: string }>>(
        `SELECT COUNT(*)::int AS total
         FROM tenants
         WHERE status IN ('active', 'trial')
           AND tier IN ${PAYING_TIERS}
           AND is_deleted = false`,
      ),

      // New paying subscribers and churned in the period
      this.dataSource.query<Array<{
        new_paying: string;
        churned:    string;
      }>>(
        `SELECT
           COUNT(*) FILTER (
             WHERE created_at >= NOW() - INTERVAL '${periodDays} days'
               AND status IN ('active', 'trial')
               AND tier IN ${PAYING_TIERS}
           )::int  AS new_paying,
           COUNT(*) FILTER (
             WHERE updated_at >= NOW() - INTERVAL '${periodDays} days'
               AND status IN ('suspended', 'terminated')
               AND tier IN ${PAYING_TIERS}
           )::int  AS churned
         FROM tenants
         WHERE is_deleted = false`,
      ),

      // Paying subscribers by tier
      this.dataSource.query<Array<{ tier: string; count: string }>>(
        `SELECT tier, COUNT(*)::int AS count
         FROM tenants
         WHERE status IN ('active', 'trial')
           AND tier IN ${PAYING_TIERS}
           AND is_deleted = false
         GROUP BY tier
         ORDER BY
           CASE tier
             WHEN 'enterprise' THEN 1
             WHEN 'pro'        THEN 2
             WHEN 'growth'     THEN 3
             WHEN 'starter'    THEN 4
             ELSE 5
           END`,
      ),
    ]);

    const totalPaying    = Number(totals[0]?.total        ?? 0);
    const newThisPeriod  = Number(periodChanges[0]?.new_paying ?? 0);
    const churnedThisPeriod = Number(periodChanges[0]?.churned  ?? 0);

    const byTier: SubscriptionByTier[] = tierRows.map((r) => ({
      tier:          r.tier,
      count:         Number(r.count),
      mrrMinorUnits: 0,  // Sprint 3: billing event aggregate
    }));

    return {
      totalPaying,
      newThisPeriod,
      churnedThisPeriod,
      churnRatePct: totalPaying > 0
        ? Math.round((churnedThisPeriod / totalPaying) * 100)
        : null,
      byTier,
      isProxy: true,
    };
  }
}
