'use client';

import { useState, useCallback } from 'react';
import { useQuery }               from '@tanstack/react-query';
import { cn }                     from '@/lib/utils/cn';
import { StatCard }               from '@/components/analytics/stat-card';
import {
  fetchRevenueBySport, fetchRevenueByBranch, fetchBookingTrends,
  fetchCustomerSummary, fetchMembershipUsage,
  fetchOccupancy, fetchCourtUtilization, fetchCancellations, fetchNoShows,
  analyticsReportKeys, analyticsKeys,
  formatMinor, nDaysAgo, todayString,
  buildExportUrl,
  type AnalyticsDateRange,
} from '@/lib/analytics.api';

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7d',  days: 6  },
  { label: '30d', days: 29 },
  { label: '90d', days: 89 },
] as const;

const TABS = [
  { id: 'revenue-sport',   label: 'Revenue by Sport'    },
  { id: 'revenue-branch',  label: 'Revenue by Branch'   },
  { id: 'booking-trends',  label: 'Booking Trends'      },
  { id: 'occupancy',       label: 'Occupancy'           },
  { id: 'court-util',      label: 'Court Utilisation'   },
  { id: 'cancellations',   label: 'Cancellations'       },
  { id: 'no-shows',        label: 'No-shows'            },
  { id: 'customer-summary',label: 'Customer Summary'    },
  { id: 'membership-usage',label: 'Membership Usage'    },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n: number): string { return `${n.toFixed(1)}%`; }
function dur(mins: number): string {
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function Pill({ label, color }: { label: string; color: string }): React.ReactElement {
  return (
    <span className={cn('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold', color)}>
      {label}
    </span>
  );
}

function SectionHeader({
  title, sub, exportReport, range,
}: { title: string; sub?: string; exportReport: string; range: AnalyticsDateRange }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <a
          href={buildExportUrl(exportReport, 'csv', range)}
          download
          className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
        >
          ↓ CSV
        </a>
        <a
          href={buildExportUrl(exportReport, 'xlsx', range)}
          download
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1"
        >
          ↓ Excel
        </a>
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }): React.ReactElement {
  return (
    <div className="animate-pulse space-y-2">
      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 rounded bg-gray-200" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 rounded bg-gray-100" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Per-tab report panels ─────────────────────────────────────────────────────

function RevenueBySportPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsReportKeys.revenueBySport(range),
    queryFn:  () => fetchRevenueBySport(range),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={5} />;

  return (
    <>
      <SectionHeader title="Revenue by Sport" exportReport="revenue-by-sport" range={range} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatMinor(data?.totalRevenueMinor ?? 0)} accent="emerald" />
        <StatCard label="Total Bookings" value={data?.totalBookings ?? 0} accent="blue" />
        <StatCard label="Sports Tracked" value={data?.bySport.length ?? 0} accent="purple" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Sport ID', 'Bookings', 'Revenue', 'Avg/booking', 'Duration', 'Cancellation %'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.bySport ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-gray-600 truncate max-w-[140px]">{row.sportId ?? '—'}</td>
                <td className="px-4 py-2 text-gray-900 font-medium">{row.totalBookings}</td>
                <td className="px-4 py-2 text-emerald-700 font-semibold">{formatMinor(row.totalRevenueMinor)}</td>
                <td className="px-4 py-2 text-gray-600">{formatMinor(row.avgRevenueMinor)}</td>
                <td className="px-4 py-2 text-gray-600">{dur(row.totalDurationMins)}</td>
                <td className="px-4 py-2">
                  <Pill label={pct(row.cancellationRate)} color={row.cancellationRate > 15 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'} />
                </td>
              </tr>
            ))}
            {(data?.bySport ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function RevenueByBranchPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsReportKeys.revenueByBranch(range),
    queryFn:  () => fetchRevenueByBranch(range),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={6} />;

  return (
    <>
      <SectionHeader title="Revenue by Branch" exportReport="revenue-by-branch" range={range} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Revenue" value={formatMinor(data?.totalRevenueMinor ?? 0)} accent="emerald" />
        <StatCard label="Total Bookings" value={data?.totalBookings ?? 0} accent="blue" />
        <StatCard label="Branches" value={data?.byBranch.length ?? 0} accent="amber" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Branch ID', 'Bookings', 'Revenue', 'Avg/booking', 'Utilisation', 'No-shows'].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.byBranch ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-gray-600 truncate max-w-[140px]">{row.branchId}</td>
                <td className="px-4 py-2 font-medium text-gray-900">{row.totalBookings}</td>
                <td className="px-4 py-2 text-emerald-700 font-semibold">{formatMinor(row.totalRevenueMinor)}</td>
                <td className="px-4 py-2 text-gray-600">{formatMinor(row.avgRevenueMinor)}</td>
                <td className="px-4 py-2">
                  <Pill label={pct(row.utilizationPct)} color={row.utilizationPct >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} />
                </td>
                <td className="px-4 py-2 text-gray-600">{row.noShowCount}</td>
              </tr>
            ))}
            {(data?.byBranch ?? []).length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BookingTrendsPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsReportKeys.bookingTrends(range),
    queryFn:  () => fetchBookingTrends({ ...range, granularity: 'day' }),
    staleTime: 5 * 60_000,
  });

  const periods = data?.byPeriod ?? [];
  const maxRev  = Math.max(1, ...periods.map((p) => p.revenueMinor));

  if (isLoading) return <TableSkeleton cols={6} />;

  return (
    <>
      <SectionHeader title="Booking Trends" sub="Daily booking and revenue trend" exportReport="booking-trends" range={range} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Bookings" value={data?.totalBookings ?? 0} accent="blue" />
        <StatCard label="Total Revenue"  value={formatMinor(data?.totalRevenueMinor ?? 0)} accent="emerald" />
        <StatCard label="Avg/day"        value={periods.length > 0 ? Math.round((data?.totalBookings ?? 0) / periods.length) : 0} accent="purple" />
        <StatCard label="Days tracked"   value={periods.length} accent="slate" />
      </div>

      {/* Mini bar chart */}
      {periods.length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Revenue trend</p>
          <div className="flex items-end gap-0.5 h-24">
            {periods.map((p) => (
              <div key={p.period} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full rounded-sm bg-emerald-400 transition-all"
                  style={{ height: `${Math.max(2, (p.revenueMinor / maxRev) * 88)}px` }}
                  title={`${p.period}: ${formatMinor(p.revenueMinor)}`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-gray-300 mt-1">
            <span>{periods[0]?.period?.slice(5)}</span>
            <span>{periods[periods.length - 1]?.period?.slice(5)}</span>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Date', 'Total', 'Confirmed', 'Cancelled', 'No-shows', 'Revenue', 'New Customers'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {periods.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600">{row.period}</td>
                <td className="px-3 py-2 font-medium text-gray-900">{row.totalBookings}</td>
                <td className="px-3 py-2 text-emerald-700">{row.confirmed}</td>
                <td className="px-3 py-2 text-red-500">{row.cancelled}</td>
                <td className="px-3 py-2 text-amber-600">{row.noShows}</td>
                <td className="px-3 py-2 text-emerald-700 font-medium">{formatMinor(row.revenueMinor)}</td>
                <td className="px-3 py-2 text-blue-600">{row.newCustomers}</td>
              </tr>
            ))}
            {periods.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OccupancyPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.occupancy(range),
    queryFn:  () => fetchOccupancy(range),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={5} />;

  return (
    <>
      <SectionHeader title="Slot Occupancy" sub="Slot utilisation by period" exportReport="occupancy" range={range} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Slots"     value={data?.totalSlots ?? 0}               accent="slate"   />
        <StatCard label="Booked"          value={data?.totalBooked ?? 0}              accent="blue"    />
        <StatCard label="Utilisation"     value={pct(data?.overallUtilizationPct ?? 0)} accent="emerald" />
        <StatCard label="Revenue"         value={formatMinor(data?.totalRevenueMinor ?? 0)} accent="purple" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Period', 'Total', 'Booked', 'Available', 'Utilisation', 'Revenue'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.byPeriod ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600">{row.period}</td>
                <td className="px-3 py-2 text-gray-900">{row.totalSlots}</td>
                <td className="px-3 py-2 text-blue-700 font-medium">{row.bookedSlots}</td>
                <td className="px-3 py-2 text-emerald-700">{row.availableSlots}</td>
                <td className="px-3 py-2">
                  <Pill label={pct(row.utilizationPct)} color={row.utilizationPct >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} />
                </td>
                <td className="px-3 py-2 text-gray-600 font-medium">{formatMinor(row.revenueMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CourtUtilPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.courtUtilization(range),
    queryFn:  () => fetchCourtUtilization(range),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={6} />;

  return (
    <>
      <SectionHeader title="Court Utilisation" sub="Ranked by utilisation %" exportReport="court-utilization" range={range} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Courts"           value={data?.totalCourts ?? 0}                    accent="slate"   />
        <StatCard label="Avg Utilisation"  value={pct(data?.avgUtilizationPct ?? 0)}         accent="emerald" />
        <StatCard label="Total Revenue"    value={formatMinor(data?.totalRevenueMinor ?? 0)} accent="purple"  />
        <StatCard label="Total Bookings"   value={data?.totalBookings ?? 0}                  accent="blue"    />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Court', 'Slots Generated', 'Slots Booked', 'Utilisation', 'Revenue', 'Avg Booking'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.courts ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600 truncate max-w-[120px]">{row.courtId.slice(0, 8)}…</td>
                <td className="px-3 py-2 text-gray-600">{row.totalSlotsGenerated}</td>
                <td className="px-3 py-2 text-blue-700 font-medium">{row.totalSlotsBooked}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 max-w-[60px] h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.utilizationPct}%` }} />
                    </div>
                    <span className="text-gray-700">{pct(row.utilizationPct)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-emerald-700 font-medium">{formatMinor(row.totalRevenueMinor)}</td>
                <td className="px-3 py-2 text-gray-600">{formatMinor(row.avgBookingValueMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CancellationsPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.cancellations(range),
    queryFn:  () => fetchCancellations(range),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={4} />;

  return (
    <>
      <SectionHeader title="Cancellation Report" sub="Cancellations by period and reason" exportReport="cancellations" range={range} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Cancellations" value={data?.totalCancellations ?? 0}                 accent="red"   />
        <StatCard label="Cancellation Rate"   value={pct(data?.cancellationRate ?? 0)}              accent="amber" />
        <StatCard label="Revenue Impact"      value={formatMinor(data?.totalRevenueImpactMinor ?? 0)} accent="red" />
        <StatCard label="Avg Lead Time"       value={`${data?.avgCancellationLeadHours?.toFixed(1) ?? 0}h`} accent="slate" />
      </div>
      {(data?.byReason ?? []).length > 0 && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold text-gray-500 mb-3">Top cancellation reasons</p>
          <div className="flex flex-col gap-2">
            {(data?.byReason ?? []).slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-40 truncate">{r.reason ?? 'No reason given'}</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${r.pct}%` }} />
                </div>
                <span className="text-xs text-gray-500 w-10 text-right">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function NoShowsPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.noShows(range),
    queryFn:  () => fetchNoShows(range),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={4} />;

  return (
    <>
      <SectionHeader title="No-show Report" sub="No-show rate and high-risk courts" exportReport="no-shows" range={range} />
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Total No-shows"    value={data?.totalNoShows ?? 0}                  accent="red"    />
        <StatCard label="No-show Rate"      value={pct(data?.overallNoShowRate ?? 0)}        accent="amber"  />
        <StatCard label="Revenue at Risk"   value={formatMinor(data?.revenueAtRiskMinor ?? 0)} accent="red" />
        <StatCard label="High-risk Courts"  value={(data?.byCourt ?? []).filter((c) => c.isHighRisk).length} accent="amber" />
      </div>
      {(data?.byCourt ?? []).length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Court', 'Total Bookings', 'No-shows', 'Rate', 'Revenue at Risk', 'Risk'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.byCourt ?? []).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-gray-600 truncate max-w-[120px]">{row.courtId.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-gray-900">{row.totalBookings}</td>
                  <td className="px-3 py-2 text-red-600 font-medium">{row.noShows}</td>
                  <td className="px-3 py-2">
                    <Pill label={pct(row.noShowRate)} color={row.isHighRisk ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'} />
                  </td>
                  <td className="px-3 py-2 text-gray-600">{formatMinor(row.revenueAtRiskMinor)}</td>
                  <td className="px-3 py-2">
                    {row.isHighRisk ? <Pill label="HIGH" color="bg-red-100 text-red-700" /> : <Pill label="OK" color="bg-emerald-100 text-emerald-700" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function CustomerSummaryPanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsReportKeys.customerSummary(range),
    queryFn:  () => fetchCustomerSummary({ ...range, limit: 50 }),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={6} />;

  return (
    <>
      <SectionHeader title="Customer Booking Summary" sub="Top customers by spend" exportReport="customer-summary" range={range} />
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard label="Unique Customers" value={data?.total ?? 0} accent="blue" />
        <StatCard label="Showing"          value={`${data?.rows.length ?? 0} of ${data?.total ?? 0}`} accent="slate" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Customer', 'Email', 'Bookings', 'Confirmed', 'Cancellations', 'No-shows', 'Total Spend', 'Last Booking'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.rows ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[140px]">{row.customerName}</td>
                <td className="px-3 py-2 text-gray-500 truncate max-w-[160px]">{row.customerEmail ?? '—'}</td>
                <td className="px-3 py-2 text-gray-900">{row.totalBookings}</td>
                <td className="px-3 py-2 text-emerald-700">{row.confirmedBookings}</td>
                <td className="px-3 py-2 text-red-500">{row.cancelledBookings}</td>
                <td className="px-3 py-2 text-amber-600">{row.noShows}</td>
                <td className="px-3 py-2 text-emerald-700 font-semibold">{formatMinor(row.totalSpendMinor)}</td>
                <td className="px-3 py-2 text-gray-500 font-mono">{row.lastBookingDate ?? '—'}</td>
              </tr>
            ))}
            {(data?.rows ?? []).length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MembershipUsagePanel({ range }: { range: AnalyticsDateRange }): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsReportKeys.membershipUsage(range),
    queryFn:  () => fetchMembershipUsage(range),
    staleTime: 5 * 60_000,
  });

  if (isLoading) return <TableSkeleton cols={5} />;

  return (
    <>
      <SectionHeader title="Membership Usage" sub="Entitlement consumption and discounts" exportReport="membership-usage" range={range} />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Discounts"      value={formatMinor(data?.totalDiscountMinor ?? 0)} accent="purple" />
        <StatCard label="Total Wallet Used"    value={formatMinor(data?.totalWalletMinor ?? 0)}   accent="blue"   />
        <StatCard label="Memberships Active"   value={data?.byMembership.length ?? 0}             accent="emerald" />
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Membership', 'Entitlement Type', 'Bookings w/ Credit', 'Total Discount', 'Wallet Used', 'Avg Discount', 'Customers'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.byMembership ?? []).map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-mono text-gray-600 truncate max-w-[120px]">{row.membershipId?.slice(0, 8) ?? '—'}…</td>
                <td className="px-3 py-2">
                  {row.entitlementType && <Pill label={row.entitlementType} color="bg-purple-100 text-purple-700" />}
                </td>
                <td className="px-3 py-2 text-blue-700 font-medium">{row.bookingsWithCredit}</td>
                <td className="px-3 py-2 text-purple-700 font-semibold">{formatMinor(row.totalDiscountMinor)}</td>
                <td className="px-3 py-2 text-blue-600">{formatMinor(row.totalWalletMinor)}</td>
                <td className="px-3 py-2 text-gray-600">{formatMinor(row.avgDiscountMinor)}</td>
                <td className="px-3 py-2 text-gray-600">{row.uniqueCustomers}</td>
              </tr>
            ))}
            {(data?.byMembership ?? []).length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No membership usage data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const PANEL_MAP: Record<TabId, React.ComponentType<{ range: AnalyticsDateRange }>> = {
  'revenue-sport':   RevenueBySportPanel,
  'revenue-branch':  RevenueByBranchPanel,
  'booking-trends':  BookingTrendsPanel,
  'occupancy':       OccupancyPanel,
  'court-util':      CourtUtilPanel,
  'cancellations':   CancellationsPanel,
  'no-shows':        NoShowsPanel,
  'customer-summary':CustomerSummaryPanel,
  'membership-usage':MembershipUsagePanel,
};

export default function ReportsDashboardPage(): React.ReactElement {
  const today  = todayString();
  const [from, setFrom]         = useState(() => nDaysAgo(29));
  const [to,   setTo]           = useState(today);
  const [activeTab, setActiveTab] = useState<TabId>('revenue-sport');
  const [preset, setPreset]     = useState('30d');

  const range: AnalyticsDateRange = { from, to, granularity: 'day' };

  const applyPreset = useCallback((label: string, days: number) => {
    setFrom(nDaysAgo(days)); setTo(todayString()); setPreset(label);
  }, []);

  const PanelComponent = PANEL_MAP[activeTab];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Reports</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Revenue · Occupancy · Trends · Customers · Memberships
          </p>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            {PRESETS.map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => applyPreset(label, days)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  preset === label
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:border-primary-500 focus:outline-none" />
          <span className="text-xs text-gray-400">→</span>
          <input type="date" value={to}   onChange={(e) => { setTo(e.target.value);   setPreset('custom'); }}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-700 bg-white focus:border-primary-500 focus:outline-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-0">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-shrink-0 px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 transition-colors',
              activeTab === id
                ? 'border-primary-500 text-primary-700 bg-primary-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Active report panel */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
        <PanelComponent range={range} />
      </div>
    </div>
  );
}
