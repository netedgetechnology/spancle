import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource }  from '@nestjs/typeorm';
import { DataSource }        from 'typeorm';
import type { Granularity }  from '../dto/analytics.dto';

// ── Result types ──────────────────────────────────────────────────────────────

export interface OccupancyPeriod {
  period:            string;
  totalSlots:        number;
  bookedSlots:       number;
  availableSlots:    number;
  reservedSlots:     number;
  completedSlots:    number;
  cancelledSlots:    number;
  utilizationPct:    number;   // booked / (total - cancelled) × 100
  revenueMinor:      number;
}

export interface OccupancySummary {
  from:              string;
  to:                string;
  totalSlots:        number;
  totalBooked:       number;
  overallUtilizationPct: number;
  totalRevenueMinor: number;
  byPeriod:          OccupancyPeriod[];
  byCourt:           CourtOccupancyRow[];
}

export interface CourtOccupancyRow {
  courtId:           string;
  branchId:          string;
  totalSlots:        number;
  bookedSlots:       number;
  utilizationPct:    number;
  revenueMinor:      number;
  avgDurationMins:   number;
}

export interface CourtUtilizationRow {
  courtId:           string;
  branchId:          string;
  totalSlotsGenerated:   number;
  totalSlotsBooked:      number;
  totalSlotsAvailable:   number;
  utilizationPct:        number;
  totalDurationMinsBooked: number;
  avgDurationMins:       number;
  totalRevenueMinor:     number;
  bookingCount:          number;
  avgBookingValueMinor:  number;
}

export interface PeakHourRow {
  hourOfDay:         number;    // 0–23
  dayOfWeek:         number;    // 0 = Sunday … 6 = Saturday
  dayName:           string;
  slotCount:         number;
  bookedCount:       number;
  utilizationPct:    number;
  revenueMinor:      number;
}

export interface PeakHourSummary {
  busiestHour:       number;
  busiestDay:        string;
  quietestHour:      number;
  byHour:            PeakHourRow[];
  heatmap:           PeakHourRow[];
}

export interface CancellationPeriod {
  period:            string;
  totalCancellations: number;
  cancelledByAdmin:  number;
  cancelledByCustomer: number;
  cancellationRate:  number;   // cancellations / total bookings × 100
  revenueImpactMinor: number;
}

export interface CancellationReasonRow {
  reason:            string | null;
  count:             number;
  pct:               number;
  revenueImpactMinor: number;
}

export interface CancellationSummary {
  from:              string;
  to:                string;
  totalCancellations: number;
  cancellationRate:  number;
  totalRevenueImpactMinor: number;
  avgCancellationLeadHours: number;
  byPeriod:          CancellationPeriod[];
  byReason:          CancellationReasonRow[];
  byCourt:           CourtCancellationRow[];
}

export interface CourtCancellationRow {
  courtId:           string;
  branchId:          string;
  totalBookings:     number;
  cancellations:     number;
  cancellationRate:  number;
  revenueImpactMinor: number;
}

export interface NoShowPeriod {
  period:            string;
  totalBookings:     number;
  noShows:           number;
  noShowRate:        number;
  waived:            number;
  revenueAtRiskMinor: number;
}

export interface NoShowCourtRow {
  courtId:           string;
  branchId:          string;
  totalBookings:     number;
  noShows:           number;
  noShowRate:        number;
  isHighRisk:        boolean;
  revenueAtRiskMinor: number;
}

export interface NoShowSummary {
  from:              string;
  to:                string;
  totalBookings:     number;
  totalNoShows:      number;
  overallNoShowRate: number;
  totalWaived:       number;
  revenueAtRiskMinor: number;
  avgNoShowLeadMins: number;
  byPeriod:          NoShowPeriod[];
  byCourt:           NoShowCourtRow[];
  byDayOfWeek:       NoShowDayRow[];
}

export interface NoShowDayRow {
  dayOfWeek:         number;
  dayName:           string;
  totalBookings:     number;
  noShows:           number;
  noShowRate:        number;
}

@Injectable()
export class AnalyticsRepository {
  private readonly logger = new Logger(AnalyticsRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ── Occupancy ──────────────────────────────────────────────────────────────

  async getOccupancy(params: {
    tenantId:          string;
    from:              string;
    to:                string;
    branchId?:         string;
    courtId?:          string;
    sportId?:          string;
    granularity?:      Granularity;
    includeCancelled?: boolean;
  }): Promise<OccupancySummary> {
    const { tenantId, from, to, branchId, courtId, sportId, granularity = 'day', includeCancelled } = params;

    const p: unknown[] = [tenantId, from, to];
    let n = 4;
    const extra: string[] = [];
    if (branchId) { extra.push(`AND branch_id = $${n++}`); p.push(branchId); }
    if (courtId)  { extra.push(`AND court_id  = $${n++}`); p.push(courtId);  }
    if (sportId)  { extra.push(`AND sport_id  = $${n++}`); p.push(sportId);  }

    const baseWhere = `
      tenant_id = $1
      AND is_deleted = false
      AND start_at >= $2::timestamptz
      AND start_at <  ($3::date + interval '1 day')::timestamptz
      ${extra.join('\n')}
    `;

    // Period breakdown
    const periodRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('${granularity}', start_at), 'YYYY-MM-DD"T"HH24:00') AS period,
        COUNT(*)::int                                                    AS "totalSlots",
        COUNT(*) FILTER (WHERE status = 'booked')::int                  AS "bookedSlots",
        COUNT(*) FILTER (WHERE status = 'available')::int               AS "availableSlots",
        COUNT(*) FILTER (WHERE status = 'reserved')::int                AS "reservedSlots",
        COUNT(*) FILTER (WHERE status = 'completed')::int               AS "completedSlots",
        COUNT(*) FILTER (WHERE status = 'cancelled')::int               AS "cancelledSlots",
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status IN ('booked','completed'))
          / NULLIF(COUNT(*) FILTER (WHERE status != 'cancelled'), 0)
        , 2)::float                                                      AS "utilizationPct",
        COALESCE(SUM(CASE WHEN status IN ('booked','completed')
          THEN COALESCE(price_override_minor, resolved_price_minor, 0)
          ELSE 0 END), 0)::bigint                                        AS "revenueMinor"
      FROM slots
      WHERE ${baseWhere}
      GROUP BY DATE_TRUNC('${granularity}', start_at)
      ORDER BY DATE_TRUNC('${granularity}', start_at)
    `, p);

    // Court breakdown
    const courtRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        court_id                                                         AS "courtId",
        branch_id                                                        AS "branchId",
        COUNT(*)::int                                                    AS "totalSlots",
        COUNT(*) FILTER (WHERE status IN ('booked','completed'))::int   AS "bookedSlots",
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status IN ('booked','completed'))
          / NULLIF(COUNT(*) FILTER (WHERE status != 'cancelled'), 0)
        , 2)::float                                                      AS "utilizationPct",
        COALESCE(SUM(CASE WHEN status IN ('booked','completed')
          THEN COALESCE(price_override_minor, resolved_price_minor, 0)
          ELSE 0 END), 0)::bigint                                        AS "revenueMinor",
        ROUND(AVG(duration_mins)::numeric, 1)::float                    AS "avgDurationMins"
      FROM slots
      WHERE ${baseWhere}
      GROUP BY court_id, branch_id
      ORDER BY "utilizationPct" DESC NULLS LAST
    `, p);

    // Totals
    const totals = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        COUNT(*)::int                                                    AS "totalSlots",
        COUNT(*) FILTER (WHERE status IN ('booked','completed'))::int   AS "totalBooked",
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status IN ('booked','completed'))
          / NULLIF(COUNT(*) FILTER (WHERE status != 'cancelled'), 0)
        , 2)::float                                                      AS "overallUtilizationPct",
        COALESCE(SUM(CASE WHEN status IN ('booked','completed')
          THEN COALESCE(price_override_minor, resolved_price_minor, 0)
          ELSE 0 END), 0)::bigint                                        AS "totalRevenueMinor"
      FROM slots
      WHERE ${baseWhere}
    `, p);

    const t = totals[0] ?? {} as Record<string, string>;

    return {
      from, to,
      totalSlots:             Number(t['totalSlots']            ?? 0),
      totalBooked:            Number(t['totalBooked']           ?? 0),
      overallUtilizationPct:  Number(t['overallUtilizationPct'] ?? 0),
      totalRevenueMinor:      Number(t['totalRevenueMinor']     ?? 0),
      byPeriod: periodRows.map((r) => ({
        period:           r['period']           ?? '',
        totalSlots:       Number(r['totalSlots']       ?? 0),
        bookedSlots:      Number(r['bookedSlots']      ?? 0),
        availableSlots:   Number(r['availableSlots']   ?? 0),
        reservedSlots:    Number(r['reservedSlots']    ?? 0),
        completedSlots:   Number(r['completedSlots']   ?? 0),
        cancelledSlots:   Number(r['cancelledSlots']   ?? 0),
        utilizationPct:   Number(r['utilizationPct']   ?? 0),
        revenueMinor:     Number(r['revenueMinor']     ?? 0),
      })),
      byCourt: courtRows.map((r) => ({
        courtId:          r['courtId']          ?? '',
        branchId:         r['branchId']         ?? '',
        totalSlots:       Number(r['totalSlots']       ?? 0),
        bookedSlots:      Number(r['bookedSlots']      ?? 0),
        utilizationPct:   Number(r['utilizationPct']   ?? 0),
        revenueMinor:     Number(r['revenueMinor']     ?? 0),
        avgDurationMins:  Number(r['avgDurationMins']  ?? 0),
      })),
    };
  }

  // ── Court utilisation ──────────────────────────────────────────────────────

  async getCourtUtilization(params: {
    tenantId:  string;
    from:      string;
    to:        string;
    branchId?: string;
    courtId?:  string;
    sortBy?:   'revenue' | 'bookings' | 'utilization';
    limit?:    number;
  }): Promise<CourtUtilizationRow[]> {
    const { tenantId, from, to, branchId, courtId, sortBy = 'utilization', limit = 50 } = params;

    const p: unknown[] = [tenantId, from, to];
    let n = 4;
    const extra: string[] = [];
    if (branchId) { extra.push(`AND s.branch_id = $${n++}`); p.push(branchId); }
    if (courtId)  { extra.push(`AND s.court_id  = $${n++}`); p.push(courtId);  }

    const sortCol =
      sortBy === 'revenue'   ? 'SUM(CASE WHEN s.status IN (\'booked\',\'completed\') THEN COALESCE(s.price_override_minor, s.resolved_price_minor, 0) ELSE 0 END)' :
      sortBy === 'bookings'  ? 'COUNT(*) FILTER (WHERE s.status IN (\'booked\',\'completed\'))' :
      /* utilization */        'ROUND(100.0 * COUNT(*) FILTER (WHERE s.status IN (\'booked\',\'completed\')) / NULLIF(COUNT(*) FILTER (WHERE s.status != \'cancelled\'), 0), 2)';

    const rows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        s.court_id                                                            AS "courtId",
        s.branch_id                                                           AS "branchId",
        COUNT(*)::int                                                         AS "totalSlotsGenerated",
        COUNT(*) FILTER (WHERE s.status IN ('booked','completed'))::int       AS "totalSlotsBooked",
        COUNT(*) FILTER (WHERE s.status = 'available')::int                  AS "totalSlotsAvailable",
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE s.status IN ('booked','completed'))
          / NULLIF(COUNT(*) FILTER (WHERE s.status != 'cancelled'), 0)
        , 2)::float                                                           AS "utilizationPct",
        COALESCE(SUM(s.duration_mins) FILTER (WHERE s.status IN ('booked','completed')), 0)::int AS "totalDurationMinsBooked",
        ROUND(AVG(s.duration_mins) FILTER (WHERE s.status IN ('booked','completed'))::numeric, 1)::float AS "avgDurationMins",
        COALESCE(SUM(CASE WHEN s.status IN ('booked','completed')
          THEN COALESCE(s.price_override_minor, s.resolved_price_minor, 0)
          ELSE 0 END), 0)::bigint                                             AS "totalRevenueMinor",
        COUNT(DISTINCT b.id)::int                                             AS "bookingCount",
        COALESCE(
          AVG(b.final_price_minor) FILTER (WHERE b.final_price_minor IS NOT NULL)
        , 0)::bigint                                                          AS "avgBookingValueMinor"
      FROM slots s
      LEFT JOIN bookings b
        ON s.booking_id = b.id
        AND b.tenant_id = s.tenant_id
        AND b.is_deleted = false
      WHERE s.tenant_id = $1
        AND s.is_deleted = false
        AND s.start_at >= $2::timestamptz
        AND s.start_at <  ($3::date + interval '1 day')::timestamptz
        ${extra.join('\n')}
      GROUP BY s.court_id, s.branch_id
      ORDER BY ${sortCol} DESC NULLS LAST
      LIMIT ${limit}
    `, p);

    return rows.map((r) => ({
      courtId:               r['courtId']               ?? '',
      branchId:              r['branchId']              ?? '',
      totalSlotsGenerated:   Number(r['totalSlotsGenerated']   ?? 0),
      totalSlotsBooked:      Number(r['totalSlotsBooked']      ?? 0),
      totalSlotsAvailable:   Number(r['totalSlotsAvailable']   ?? 0),
      utilizationPct:        Number(r['utilizationPct']        ?? 0),
      totalDurationMinsBooked: Number(r['totalDurationMinsBooked'] ?? 0),
      avgDurationMins:       Number(r['avgDurationMins']       ?? 0),
      totalRevenueMinor:     Number(r['totalRevenueMinor']     ?? 0),
      bookingCount:          Number(r['bookingCount']          ?? 0),
      avgBookingValueMinor:  Number(r['avgBookingValueMinor']  ?? 0),
    }));
  }

  // ── Peak hours ─────────────────────────────────────────────────────────────

  async getPeakHours(params: {
    tenantId:   string;
    from:       string;
    to:         string;
    branchId?:  string;
    courtId?:   string;
    sportId?:   string;
    dayOfWeek?: number;
  }): Promise<PeakHourSummary> {
    const { tenantId, from, to, branchId, courtId, sportId, dayOfWeek } = params;

    const p: unknown[] = [tenantId, from, to];
    let n = 4;
    const extra: string[] = [];
    if (branchId)  { extra.push(`AND branch_id = $${n++}`); p.push(branchId);  }
    if (courtId)   { extra.push(`AND court_id  = $${n++}`); p.push(courtId);   }
    if (sportId)   { extra.push(`AND sport_id  = $${n++}`); p.push(sportId);   }
    if (dayOfWeek !== undefined) { extra.push(`AND EXTRACT(DOW FROM start_at) = $${n++}`); p.push(dayOfWeek); }

    const baseWhere = `
      tenant_id = $1
      AND is_deleted = false
      AND status NOT IN ('cancelled')
      AND start_at >= $2::timestamptz
      AND start_at <  ($3::date + interval '1 day')::timestamptz
      ${extra.join('\n')}
    `;

    const rows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        EXTRACT(HOUR FROM start_at)::int                                AS "hourOfDay",
        EXTRACT(DOW  FROM start_at)::int                                AS "dayOfWeek",
        TO_CHAR(start_at, 'Day')                                        AS "dayName",
        COUNT(*)::int                                                   AS "slotCount",
        COUNT(*) FILTER (WHERE status IN ('booked','completed'))::int   AS "bookedCount",
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE status IN ('booked','completed'))
          / NULLIF(COUNT(*), 0)
        , 2)::float                                                     AS "utilizationPct",
        COALESCE(SUM(CASE WHEN status IN ('booked','completed')
          THEN COALESCE(price_override_minor, resolved_price_minor, 0)
          ELSE 0 END), 0)::bigint                                       AS "revenueMinor"
      FROM slots
      WHERE ${baseWhere}
      GROUP BY EXTRACT(HOUR FROM start_at), EXTRACT(DOW FROM start_at), TO_CHAR(start_at, 'Day')
      ORDER BY EXTRACT(DOW FROM start_at), EXTRACT(HOUR FROM start_at)
    `, p);

    const mapped = rows.map((r) => ({
      hourOfDay:      Number(r['hourOfDay']      ?? 0),
      dayOfWeek:      Number(r['dayOfWeek']      ?? 0),
      dayName:        (r['dayName'] ?? '').trim(),
      slotCount:      Number(r['slotCount']      ?? 0),
      bookedCount:    Number(r['bookedCount']    ?? 0),
      utilizationPct: Number(r['utilizationPct'] ?? 0),
      revenueMinor:   Number(r['revenueMinor']   ?? 0),
    }));

    // Find busiest/quietest by utilization
    const sorted     = [...mapped].sort((a, b) => b.utilizationPct - a.utilizationPct);
    const busiestRow = sorted[0];
    const quietest   = sorted[sorted.length - 1];

    return {
      busiestHour:  busiestRow?.hourOfDay ?? 0,
      busiestDay:   busiestRow?.dayName   ?? '',
      quietestHour: quietest?.hourOfDay   ?? 0,
      byHour: mapped.filter((r, i, arr) =>
        i === arr.findIndex((x) => x.hourOfDay === r.hourOfDay)
      ).map((r) => ({
        ...r,
        // Average across all days for this hour
        dayOfWeek: -1,
        dayName: 'All days',
        slotCount:      mapped.filter((x) => x.hourOfDay === r.hourOfDay).reduce((s, x) => s + x.slotCount, 0),
        bookedCount:    mapped.filter((x) => x.hourOfDay === r.hourOfDay).reduce((s, x) => s + x.bookedCount, 0),
        utilizationPct: Math.round(
          mapped.filter((x) => x.hourOfDay === r.hourOfDay)
                .reduce((s, x) => s + x.utilizationPct, 0) /
          Math.max(1, mapped.filter((x) => x.hourOfDay === r.hourOfDay).length)
          * 100) / 100,
        revenueMinor:   mapped.filter((x) => x.hourOfDay === r.hourOfDay).reduce((s, x) => s + x.revenueMinor, 0),
      })).sort((a, b) => a.hourOfDay - b.hourOfDay),
      heatmap: mapped,
    };
  }

  // ── Cancellation analytics ─────────────────────────────────────────────────

  async getCancellationAnalytics(params: {
    tenantId:       string;
    from:           string;
    to:             string;
    branchId?:      string;
    courtId?:       string;
    granularity?:   Granularity;
    groupByReason?: boolean;
  }): Promise<CancellationSummary> {
    const { tenantId, from, to, branchId, courtId, granularity = 'day', groupByReason = true } = params;

    const p: unknown[] = [tenantId, from, to];
    let n = 4;
    const extra: string[] = [];
    if (branchId) { extra.push(`AND branch_id = $${n++}`); p.push(branchId); }
    if (courtId)  { extra.push(`AND court_id  = $${n++}`); p.push(courtId);  }

    const bWhere = `
      tenant_id = $1
      AND is_deleted = false
      AND starts_at >= $2::timestamptz
      AND starts_at <  ($3::date + interval '1 day')::timestamptz
      ${extra.join('\n')}
    `;

    // Totals
    const totals = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        COUNT(*)::int                                                  AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'cancelled')::int             AS "totalCancellations",
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'cancelled')
          / NULLIF(COUNT(*), 0), 2)::float                            AS "cancellationRate",
        COALESCE(SUM(final_price_minor)
          FILTER (WHERE status = 'cancelled'), 0)::bigint             AS "totalRevenueImpactMinor",
        ROUND(AVG(
          EXTRACT(EPOCH FROM (cancelled_at - starts_at)) / 3600.0
        ) FILTER (WHERE status = 'cancelled' AND cancelled_at IS NOT NULL), 2)::float
                                                                      AS "avgCancellationLeadHours"
      FROM bookings WHERE ${bWhere}
    `, p);

    // Period breakdown
    const periodRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('${granularity}', starts_at), 'YYYY-MM-DD') AS period,
        COUNT(*)::int                                                    AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'cancelled')::int               AS "totalCancellations",
        COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by_id IS NOT NULL
          AND cancelled_by_id != user_id)::int                          AS "cancelledByAdmin",
        COUNT(*) FILTER (WHERE status = 'cancelled' AND cancelled_by_id = user_id)::int AS "cancelledByCustomer",
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'cancelled')
          / NULLIF(COUNT(*), 0), 2)::float                              AS "cancellationRate",
        COALESCE(SUM(final_price_minor)
          FILTER (WHERE status = 'cancelled'), 0)::bigint               AS "revenueImpactMinor"
      FROM bookings WHERE ${bWhere}
      GROUP BY DATE_TRUNC('${granularity}', starts_at)
      ORDER BY DATE_TRUNC('${granularity}', starts_at)
    `, p);

    // By reason
    const reasonRows = groupByReason
      ? await this.dataSource.query<Array<Record<string, string>>>(`
          SELECT
            cancellation_reason                                          AS reason,
            COUNT(*)::int                                                AS count,
            COALESCE(SUM(final_price_minor), 0)::bigint                 AS "revenueImpactMinor"
          FROM bookings
          WHERE ${bWhere} AND status = 'cancelled'
          GROUP BY cancellation_reason
          ORDER BY COUNT(*) DESC
        `, p)
      : [];

    // By court
    const courtRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        court_id                                                        AS "courtId",
        branch_id                                                       AS "branchId",
        COUNT(*)::int                                                   AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'cancelled')::int              AS cancellations,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'cancelled')
          / NULLIF(COUNT(*), 0), 2)::float                             AS "cancellationRate",
        COALESCE(SUM(final_price_minor)
          FILTER (WHERE status = 'cancelled'), 0)::bigint              AS "revenueImpactMinor"
      FROM bookings WHERE ${bWhere}
      GROUP BY court_id, branch_id
      ORDER BY cancellations DESC NULLS LAST
    `, p);

    const totalCancellations = Number(totals[0]?.['totalCancellations'] ?? 0);
    const t = totals[0] ?? {} as Record<string, string>;

    return {
      from, to,
      totalCancellations,
      cancellationRate:        Number(t['cancellationRate']        ?? 0),
      totalRevenueImpactMinor: Number(t['totalRevenueImpactMinor'] ?? 0),
      avgCancellationLeadHours: Number(t['avgCancellationLeadHours'] ?? 0),
      byPeriod: periodRows.map((r) => ({
        period:              r['period']              ?? '',
        totalCancellations:  Number(r['totalCancellations']  ?? 0),
        cancelledByAdmin:    Number(r['cancelledByAdmin']    ?? 0),
        cancelledByCustomer: Number(r['cancelledByCustomer'] ?? 0),
        cancellationRate:    Number(r['cancellationRate']    ?? 0),
        revenueImpactMinor:  Number(r['revenueImpactMinor']  ?? 0),
      })),
      byReason: reasonRows.map((r) => ({
        reason:             r['reason']             ?? null,
        count:              Number(r['count']              ?? 0),
        pct:                totalCancellations > 0
          ? Math.round((Number(r['count'] ?? 0) / totalCancellations) * 10000) / 100
          : 0,
        revenueImpactMinor: Number(r['revenueImpactMinor'] ?? 0),
      })),
      byCourt: courtRows.map((r) => ({
        courtId:            r['courtId']            ?? '',
        branchId:           r['branchId']           ?? '',
        totalBookings:      Number(r['totalBookings']      ?? 0),
        cancellations:      Number(r['cancellations']      ?? 0),
        cancellationRate:   Number(r['cancellationRate']   ?? 0),
        revenueImpactMinor: Number(r['revenueImpactMinor'] ?? 0),
      })),
    };
  }

  // ── No-show analytics ──────────────────────────────────────────────────────

  async getNoShowAnalytics(params: {
    tenantId:           string;
    from:               string;
    to:                 string;
    branchId?:          string;
    courtId?:           string;
    granularity?:       Granularity;
    riskThresholdPct?:  number;
  }): Promise<NoShowSummary> {
    const { tenantId, from, to, branchId, courtId, granularity = 'day', riskThresholdPct = 20 } = params;

    const p: unknown[] = [tenantId, from, to];
    let n = 4;
    const extra: string[] = [];
    if (branchId) { extra.push(`AND branch_id = $${n++}`); p.push(branchId); }
    if (courtId)  { extra.push(`AND court_id  = $${n++}`); p.push(courtId);  }

    const bWhere = `
      tenant_id = $1
      AND is_deleted = false
      AND status NOT IN ('cancelled','draft')
      AND starts_at >= $2::timestamptz
      AND starts_at <  ($3::date + interval '1 day')::timestamptz
      ${extra.join('\n')}
    `;

    // Totals
    const totals = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        COUNT(*)::int                                                   AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'no_show')::int                AS "totalNoShows",
        COUNT(*) FILTER (WHERE status = 'refunded'
          AND amount_refunded_minor > 0)::int                          AS "totalWaived",
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'no_show')
          / NULLIF(COUNT(*), 0), 2)::float                             AS "overallNoShowRate",
        COALESCE(SUM(final_price_minor)
          FILTER (WHERE status = 'no_show'), 0)::bigint                AS "revenueAtRiskMinor",
        ROUND(AVG(
          EXTRACT(EPOCH FROM (starts_at - created_at)) / 60.0
        ) FILTER (WHERE status = 'no_show'), 2)::float                 AS "avgNoShowLeadMins"
      FROM bookings WHERE ${bWhere}
    `, p);

    // Period breakdown
    const periodRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        TO_CHAR(DATE_TRUNC('${granularity}', starts_at), 'YYYY-MM-DD') AS period,
        COUNT(*)::int                                                    AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'no_show')::int                 AS "noShows",
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'no_show')
          / NULLIF(COUNT(*), 0), 2)::float                              AS "noShowRate",
        COUNT(*) FILTER (WHERE status = 'refunded'
          AND amount_refunded_minor > 0)::int                           AS waived,
        COALESCE(SUM(final_price_minor)
          FILTER (WHERE status = 'no_show'), 0)::bigint                 AS "revenueAtRiskMinor"
      FROM bookings WHERE ${bWhere}
      GROUP BY DATE_TRUNC('${granularity}', starts_at)
      ORDER BY DATE_TRUNC('${granularity}', starts_at)
    `, p);

    // By court with high-risk flag
    const courtRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        court_id                                                        AS "courtId",
        branch_id                                                       AS "branchId",
        COUNT(*)::int                                                   AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'no_show')::int                AS "noShows",
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'no_show')
          / NULLIF(COUNT(*), 0), 2)::float                             AS "noShowRate",
        COALESCE(SUM(final_price_minor)
          FILTER (WHERE status = 'no_show'), 0)::bigint                AS "revenueAtRiskMinor"
      FROM bookings WHERE ${bWhere}
      GROUP BY court_id, branch_id
      ORDER BY "noShowRate" DESC NULLS LAST
    `, p);

    // By day of week
    const dowRows = await this.dataSource.query<Array<Record<string, string>>>(`
      SELECT
        EXTRACT(DOW FROM starts_at)::int                               AS "dayOfWeek",
        TO_CHAR(starts_at, 'Day')                                      AS "dayName",
        COUNT(*)::int                                                   AS "totalBookings",
        COUNT(*) FILTER (WHERE status = 'no_show')::int               AS "noShows",
        ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'no_show')
          / NULLIF(COUNT(*), 0), 2)::float                             AS "noShowRate"
      FROM bookings WHERE ${bWhere}
      GROUP BY EXTRACT(DOW FROM starts_at), TO_CHAR(starts_at, 'Day')
      ORDER BY EXTRACT(DOW FROM starts_at)
    `, p);

    const t = totals[0] ?? {} as Record<string, string>;

    return {
      from, to,
      totalBookings:      Number(t['totalBookings']      ?? 0),
      totalNoShows:       Number(t['totalNoShows']       ?? 0),
      overallNoShowRate:  Number(t['overallNoShowRate']  ?? 0),
      totalWaived:        Number(t['totalWaived']        ?? 0),
      revenueAtRiskMinor: Number(t['revenueAtRiskMinor'] ?? 0),
      avgNoShowLeadMins:  Number(t['avgNoShowLeadMins']  ?? 0),
      byPeriod: periodRows.map((r) => ({
        period:            r['period']            ?? '',
        totalBookings:     Number(r['totalBookings']     ?? 0),
        noShows:           Number(r['noShows']           ?? 0),
        noShowRate:        Number(r['noShowRate']        ?? 0),
        waived:            Number(r['waived']            ?? 0),
        revenueAtRiskMinor: Number(r['revenueAtRiskMinor'] ?? 0),
      })),
      byCourt: courtRows.map((r) => ({
        courtId:            r['courtId']            ?? '',
        branchId:           r['branchId']           ?? '',
        totalBookings:      Number(r['totalBookings']      ?? 0),
        noShows:            Number(r['noShows']            ?? 0),
        noShowRate:         Number(r['noShowRate']         ?? 0),
        isHighRisk:         Number(r['noShowRate']         ?? 0) >= riskThresholdPct,
        revenueAtRiskMinor: Number(r['revenueAtRiskMinor'] ?? 0),
      })),
      byDayOfWeek: dowRows.map((r) => ({
        dayOfWeek:     Number(r['dayOfWeek']     ?? 0),
        dayName:       (r['dayName'] ?? '').trim(),
        totalBookings: Number(r['totalBookings'] ?? 0),
        noShows:       Number(r['noShows']       ?? 0),
        noShowRate:    Number(r['noShowRate']    ?? 0),
      })),
    };
  }
}
