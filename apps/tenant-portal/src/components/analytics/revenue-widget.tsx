'use client';

import { useQuery }        from '@tanstack/react-query';
import { cn }              from '@/lib/utils/cn';
import { fetchOccupancy, analyticsKeys, formatMinor, type AnalyticsDateRange } from '@/lib/analytics.api';

interface RevenueWidgetProps {
  range: AnalyticsDateRange;
}

export function RevenueWidget({ range }: RevenueWidgetProps): React.ReactElement {
  const { data, isLoading, error } = useQuery({
    queryKey: analyticsKeys.occupancy(range),
    queryFn:  () => fetchOccupancy(range),
    staleTime: 5 * 60_000,
  });

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load revenue data
      </div>
    );
  }

  const periods    = data?.byPeriod ?? [];
  const total      = periods.reduce((s, p) => s + p.revenueMinor, 0);
  const maxRevenue = Math.max(1, ...periods.map((p) => p.revenueMinor));
  const avgRevenue = periods.length > 0 ? Math.round(total / periods.length) : 0;
  const peakPeriod = periods.reduce((best, p) =>
    p.revenueMinor > (best?.revenueMinor ?? 0) ? p : best, periods[0],
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Revenue</h3>
        <p className="text-xs text-gray-400 mt-0.5">Booking revenue by period</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {[
          { label: 'Total',    value: isLoading ? '—' : formatMinor(total)              },
          { label: 'Avg/period', value: isLoading ? '—' : formatMinor(avgRevenue)       },
          { label: 'Peak period', value: isLoading ? '—' : (peakPeriod?.period?.slice(5) ?? '—') },
        ].map(({ label, value }) => (
          <div key={label} className="px-4 py-3 text-center">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="px-5 py-4">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-3 w-16 rounded bg-gray-100 flex-shrink-0" />
                <div className="h-6 rounded bg-gray-100" style={{ width: `${15 + i * 14}%` }} />
              </div>
            ))}
          </div>
        ) : periods.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No revenue data for selected range</p>
        ) : (
          <div className="space-y-1.5">
            {periods.slice(-12).map((p) => {
              const barPct = maxRevenue > 0 ? (p.revenueMinor / maxRevenue) * 100 : 0;
              const isPeak = p === peakPeriod;

              return (
                <div key={p.period} className="flex items-center gap-2 group">
                  <span className="text-[10px] font-mono text-gray-400 w-20 flex-shrink-0 text-right">
                    {p.period.slice(5)}
                  </span>
                  <div className="flex-1 h-6 rounded bg-gray-100 relative overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded transition-all',
                        isPeak ? 'bg-purple-500' : 'bg-purple-300',
                      )}
                      style={{ width: `${barPct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-2 text-[10px] font-semibold text-gray-700">
                      {formatMinor(p.revenueMinor)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
