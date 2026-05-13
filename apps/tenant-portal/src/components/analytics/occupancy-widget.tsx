'use client';

import { useQuery }        from '@tanstack/react-query';
import { cn }              from '@/lib/utils/cn';
import {
  fetchOccupancy,
  analyticsKeys,
  type AnalyticsDateRange,
} from '@/lib/analytics.api';

interface OccupancyWidgetProps {
  range: AnalyticsDateRange;
}

export function OccupancyWidget({ range }: OccupancyWidgetProps): React.ReactElement {
  const { data, isLoading, error } = useQuery({
    queryKey: analyticsKeys.occupancy(range),
    queryFn:  () => fetchOccupancy(range),
    staleTime: 5 * 60_000,
  });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load occupancy data
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Occupancy</h3>
          <p className="text-xs text-gray-400 mt-0.5">Slot utilisation over time</p>
        </div>
        {!isLoading && data && (
          <span className={cn(
            'rounded-full px-2.5 py-1 text-sm font-bold',
            data.overallUtilizationPct >= 70 ? 'bg-emerald-100 text-emerald-800' :
            data.overallUtilizationPct >= 40 ? 'bg-amber-100 text-amber-800' :
            'bg-gray-100 text-gray-600',
          )}>
            {data.overallUtilizationPct}%
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[
          {
            label: 'Total slots',
            value: isLoading ? '—' : (data?.totalSlots ?? 0).toLocaleString(),
          },
          {
            label: 'Booked',
            value: isLoading ? '—' : (data?.totalBooked ?? 0).toLocaleString(),
          },
          {
            label: 'Utilisation',
            value: isLoading ? '—' : `${data?.overallUtilizationPct ?? 0}%`,
          },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3 text-center">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-base font-bold text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-16 rounded bg-gray-100 flex-shrink-0" />
                <div className="h-5 rounded bg-gray-100" style={{ width: `${20 + i * 12}%` }} />
              </div>
            ))}
          </div>
        ) : !data?.byPeriod.length ? (
          <p className="text-xs text-gray-400 py-4 text-center">No data for selected range</p>
        ) : (
          <div className="space-y-1.5">
            {data.byPeriod.slice(-14).map((p) => {
              const pct       = p.utilizationPct;
              const booked    = p.bookedSlots + p.completedSlots;
              const available = p.totalSlots - p.cancelledSlots - booked;
              const cancelled = p.cancelledSlots;
              const total     = Math.max(1, p.totalSlots);

              return (
                <div key={p.period} className="flex items-center gap-2 group">
                  <span className="text-[10px] font-mono text-gray-400 w-20 flex-shrink-0 text-right">
                    {p.period.slice(5)}
                  </span>
                  <div className="flex-1 flex h-5 rounded overflow-hidden bg-gray-100 relative">
                    {/* Booked */}
                    <div
                      className="bg-blue-500 h-full transition-all"
                      style={{ width: `${(booked / total) * 100}%` }}
                      title={`Booked: ${booked}`}
                    />
                    {/* Available */}
                    <div
                      className="bg-emerald-200 h-full transition-all"
                      style={{ width: `${(available / total) * 100}%` }}
                      title={`Available: ${available}`}
                    />
                    {/* Cancelled */}
                    {cancelled > 0 && (
                      <div
                        className="bg-gray-300 h-full transition-all"
                        style={{ width: `${(cancelled / total) * 100}%` }}
                        title={`Cancelled: ${cancelled}`}
                      />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold w-8 text-right',
                    pct >= 70 ? 'text-blue-700' : pct >= 40 ? 'text-amber-600' : 'text-gray-400',
                  )}>
                    {pct}%
                  </span>
                </div>
              );
            })}
            {/* Legend */}
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              {[
                ['bg-blue-500',    'Booked'],
                ['bg-emerald-200', 'Available'],
                ['bg-gray-300',    'Cancelled'],
              ].map(([color, label]) => (
                <span key={label} className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span className={`h-2 w-2 rounded-sm ${color}`} aria-hidden="true" />
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
