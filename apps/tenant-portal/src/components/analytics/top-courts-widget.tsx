'use client';

import { useState }   from 'react';
import { useQuery }   from '@tanstack/react-query';
import { cn }         from '@/lib/utils/cn';
import {
  fetchCourtUtilization,
  analyticsKeys,
  formatMinor,
  type AnalyticsDateRange,
} from '@/lib/analytics.api';

interface TopCourtsWidgetProps {
  range: AnalyticsDateRange;
}

type SortKey = 'utilization' | 'revenue' | 'bookings';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'utilization', label: 'Utilisation' },
  { key: 'revenue',     label: 'Revenue'     },
  { key: 'bookings',    label: 'Bookings'    },
];

export function TopCourtsWidget({ range }: TopCourtsWidgetProps): React.ReactElement {
  const [sortBy, setSortBy] = useState<SortKey>('utilization');

  const { data, isLoading, error } = useQuery({
    queryKey: analyticsKeys.courtUtilization({ ...range }),
    queryFn:  () => fetchCourtUtilization({ ...range, sortBy }),
    staleTime: 5 * 60_000,
  });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load court data
      </div>
    );
  }

  const courts   = data?.courts ?? [];
  const maxValue = sortBy === 'utilization'
    ? Math.max(1, ...courts.map((c) => c.utilizationPct))
    : sortBy === 'revenue'
    ? Math.max(1, ...courts.map((c) => c.totalRevenueMinor))
    : Math.max(1, ...courts.map((c) => c.bookingCount));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Top courts</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {!isLoading && data ? `${data.totalCourts} courts · ${data.avgUtilizationPct}% avg utilisation` : 'Loading…'}
          </p>
        </div>
        {/* Sort tabs */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortBy(key)}
              className={cn(
                'px-2.5 py-1 text-[10px] font-semibold transition-colors',
                sortBy === key
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Revenue',      value: isLoading ? '—' : formatMinor(data?.totalRevenueMinor ?? 0) },
          { label: 'Bookings',     value: isLoading ? '—' : (data?.totalBookings ?? 0).toLocaleString() },
          { label: 'Avg util.',    value: isLoading ? '—' : `${data?.avgUtilizationPct ?? 0}%` },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-2.5 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Court table */}
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-4 rounded bg-gray-100 flex-shrink-0" />
                <div className="h-3 flex-1 rounded bg-gray-100" />
                <div className="h-3 w-12 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : courts.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No court data for selected range</p>
        ) : (
          <div className="space-y-2.5">
            {courts.slice(0, 8).map((court, idx) => {
              const barValue = sortBy === 'utilization'
                ? court.utilizationPct
                : sortBy === 'revenue'
                ? court.totalRevenueMinor
                : court.bookingCount;

              const barPct = (barValue / maxValue) * 100;

              const metricStr = sortBy === 'utilization'
                ? `${court.utilizationPct}%`
                : sortBy === 'revenue'
                ? formatMinor(court.totalRevenueMinor)
                : court.bookingCount.toLocaleString();

              const utilColor =
                court.utilizationPct >= 70 ? 'bg-emerald-500' :
                court.utilizationPct >= 40 ? 'bg-amber-400' :
                'bg-gray-300';

              return (
                <div key={court.courtId} className="flex items-center gap-2.5">
                  {/* Rank */}
                  <span className="text-[10px] font-bold text-gray-300 w-4 flex-shrink-0 text-right">
                    {idx + 1}
                  </span>

                  {/* ID + branch */}
                  <div className="w-24 flex-shrink-0 min-w-0">
                    <p className="text-[10px] font-mono text-gray-600 truncate">{court.courtId.slice(0, 8)}…</p>
                    <p className="text-[9px] text-gray-400 truncate">{court.branchId.slice(0, 6)}…</p>
                  </div>

                  {/* Bar */}
                  <div className="flex-1 h-4 rounded-full bg-gray-100 relative overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', utilColor)}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>

                  {/* Value */}
                  <span className="text-xs font-semibold text-gray-700 w-16 text-right flex-shrink-0">
                    {metricStr}
                  </span>
                </div>
              );
            })}

            {courts.length > 8 && (
              <p className="text-[10px] text-gray-400 pt-1 text-center">
                +{courts.length - 8} more courts
              </p>
            )}

            {/* Legend for utilisation bar color */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              {[
                ['bg-emerald-500', '≥70%'],
                ['bg-amber-400',   '40–70%'],
                ['bg-gray-300',    '<40%'],
              ].map(([color, label]) => (
                <span key={label} className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
