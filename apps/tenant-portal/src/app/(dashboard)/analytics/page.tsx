'use client';

import { useState }             from 'react';
import { cn }                   from '@/lib/utils/cn';
import { StatCard }             from '@/components/analytics/stat-card';
import { OccupancyWidget }      from '@/components/analytics/occupancy-widget';
import { RevenueWidget }        from '@/components/analytics/revenue-widget';
import { BookingWidget }        from '@/components/analytics/booking-widget';
import { TopCourtsWidget }      from '@/components/analytics/top-courts-widget';
import { PeakHoursWidget }      from '@/components/analytics/peak-hours-widget';
import { useQuery }             from '@tanstack/react-query';
import {
  fetchOccupancy,
  fetchCancellations,
  fetchNoShows,
  analyticsKeys,
  formatMinor,
  nDaysAgo,
  todayString,
  type AnalyticsDateRange,
} from '@/lib/analytics.api';

// ── Preset ranges ─────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '7d',  from: () => nDaysAgo(6),  to: todayString },
  { label: '30d', from: () => nDaysAgo(29), to: todayString },
  { label: '90d', from: () => nDaysAgo(89), to: todayString },
] as const;

export default function AnalyticsDashboardPage(): React.ReactElement {
  const today   = todayString();
  const [from, setFrom] = useState(() => nDaysAgo(29));
  const [to,   setTo  ] = useState(today);
  const [activePreset, setActivePreset] = useState<string>('30d');

  const range: AnalyticsDateRange = { from, to, granularity: 'day' };

  // Header KPI queries
  const { data: occData,  isLoading: occLoading  } = useQuery({
    queryKey: analyticsKeys.occupancy(range),
    queryFn:  () => fetchOccupancy(range),
    staleTime: 5 * 60_000,
  });
  const { data: cancData, isLoading: cancLoading } = useQuery({
    queryKey: analyticsKeys.cancellations(range),
    queryFn:  () => fetchCancellations(range),
    staleTime: 5 * 60_000,
  });
  const { data: nsData,   isLoading: nsLoading   } = useQuery({
    queryKey: analyticsKeys.noShows(range),
    queryFn:  () => fetchNoShows(range),
    staleTime: 5 * 60_000,
  });

  const applyPreset = (label: string, fromFn: () => string, toFn: () => string): void => {
    setFrom(fromFn());
    setTo(toFn());
    setActivePreset(label);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Occupancy · Revenue · Bookings · Courts
          </p>
        </div>

        {/* Date range controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preset buttons */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            {PRESETS.map(({ label, from: fromFn, to: toFn }) => (
              <button
                key={label}
                type="button"
                onClick={() => applyPreset(label, fromFn, toFn)}
                className={cn(
                  'px-3 py-1.5 text-xs font-semibold transition-colors',
                  activePreset === label
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => { setFrom(e.target.value); setActivePreset('custom'); }}
              className="text-xs text-gray-700 focus:outline-none w-28"
              aria-label="From date"
            />
            <span className="text-gray-300 text-xs">–</span>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => { setTo(e.target.value); setActivePreset('custom'); }}
              className="text-xs text-gray-700 focus:outline-none w-28"
              aria-label="To date"
            />
          </div>
        </div>
      </div>

      {/* ── KPI summary row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Utilisation"
          value={occLoading ? '…' : `${occData?.overallUtilizationPct ?? 0}%`}
          subValue={occLoading ? '' : `${(occData?.totalBooked ?? 0).toLocaleString()} slots booked`}
          accent="blue"
          isLoading={occLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />

        <StatCard
          label="Revenue"
          value={occLoading ? '…' : formatMinor(occData?.totalRevenueMinor ?? 0)}
          subValue="from bookings"
          accent="purple"
          isLoading={occLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          label="Cancellation rate"
          value={cancLoading ? '…' : `${cancData?.cancellationRate ?? 0}%`}
          subValue={cancLoading ? '' : `${(cancData?.totalCancellations ?? 0).toLocaleString()} cancelled`}
          accent="amber"
          isLoading={cancLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          }
        />

        <StatCard
          label="No-show rate"
          value={nsLoading ? '…' : `${nsData?.overallNoShowRate ?? 0}%`}
          subValue={nsLoading ? '' : `${nsData?.highRiskCourts?.length ?? 0} high-risk courts`}
          accent="red"
          isLoading={nsLoading}
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
        />
      </div>

      {/* ── Primary widgets row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OccupancyWidget range={range} />
        <RevenueWidget   range={range} />
      </div>

      {/* ── Secondary widgets row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TopCourtsWidget range={range} />
        </div>
        <BookingWidget range={range} />
      </div>

      {/* ── Peak hours heatmap ────────────────────────────────────────────── */}
      <PeakHoursWidget range={range} />
    </div>
  );
}
