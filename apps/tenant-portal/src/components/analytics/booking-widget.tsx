'use client';

import { useQuery }   from '@tanstack/react-query';
import { cn }         from '@/lib/utils/cn';
import {
  fetchCancellations,
  fetchNoShows,
  analyticsKeys,
  type AnalyticsDateRange,
} from '@/lib/analytics.api';

interface BookingWidgetProps {
  range: AnalyticsDateRange;
}

export function BookingWidget({ range }: BookingWidgetProps): React.ReactElement {
  const { data: cancData, isLoading: cancLoading } = useQuery({
    queryKey: analyticsKeys.cancellations(range),
    queryFn:  () => fetchCancellations(range),
    staleTime: 5 * 60_000,
  });

  const { data: nsData, isLoading: nsLoading } = useQuery({
    queryKey: analyticsKeys.noShows(range),
    queryFn:  () => fetchNoShows(range),
    staleTime: 5 * 60_000,
  });

  const isLoading = cancLoading || nsLoading;

  const kpis = [
    {
      label:     'Cancellations',
      value:     isLoading ? '—' : (cancData?.totalCancellations ?? 0).toLocaleString(),
      sub:       isLoading ? '' : `${cancData?.cancellationRate ?? 0}% rate`,
      color:     'text-amber-700',
      bg:        'bg-amber-50',
      dotColor:  'bg-amber-400',
    },
    {
      label:     'No-shows',
      value:     isLoading ? '—' : (nsData?.totalNoShows ?? 0).toLocaleString(),
      sub:       isLoading ? '' : `${nsData?.overallNoShowRate ?? 0}% rate`,
      color:     'text-red-700',
      bg:        'bg-red-50',
      dotColor:  'bg-red-500',
    },
    {
      label:     'Waived',
      value:     isLoading ? '—' : (nsData?.totalWaived ?? 0).toLocaleString(),
      sub:       'no-show waivers',
      color:     'text-slate-600',
      bg:        'bg-slate-50',
      dotColor:  'bg-slate-400',
    },
  ];

  const highRisk = nsData?.highRiskCourts ?? [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">Booking health</h3>
        <p className="text-xs text-gray-400 mt-0.5">Cancellations · No-shows · Risk</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
        {kpis.map(({ label, value, sub, color, bg, dotColor }) => (
          <div key={label} className={cn('px-4 py-3 text-center', bg)}>
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', dotColor)} aria-hidden="true" />
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
            </div>
            <p className={cn('text-xl font-bold', color)}>{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Cancellation trend mini-bars */}
      <div className="px-5 py-4 border-b border-gray-100">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Cancellation trend
        </p>
        {cancLoading ? (
          <div className="flex items-end gap-1 h-12 animate-pulse">
            {[1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="flex-1 rounded-t bg-gray-100" style={{ height: `${20 + i * 8}%` }} />
            ))}
          </div>
        ) : (cancData?.byPeriod.length ?? 0) === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">No data</p>
        ) : (
          <div className="flex items-end gap-0.5 h-12">
            {cancData!.byPeriod.slice(-14).map((p) => {
              const maxRate = Math.max(1, ...cancData!.byPeriod.map((x) => x.cancellationRate));
              const h = Math.max(4, (p.cancellationRate / maxRate) * 100);
              return (
                <div
                  key={p.period}
                  className="flex-1 rounded-t bg-amber-400 hover:bg-amber-500 transition-colors cursor-default"
                  style={{ height: `${h}%` }}
                  title={`${p.period.slice(5)}: ${p.cancellationRate}% rate (${p.totalCancellations})`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* High-risk courts */}
      <div className="px-5 py-4">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
          High no-show risk courts
          {highRisk.length > 0 && (
            <span className="ml-1.5 rounded-full bg-red-100 text-red-700 px-1.5 py-0.5 text-[9px] font-bold">
              {highRisk.length}
            </span>
          )}
        </p>
        {nsLoading ? (
          <div className="space-y-1.5 animate-pulse">
            {[1,2].map((i) => (
              <div key={i} className="h-8 rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : highRisk.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-emerald-700">
            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No high-risk courts in this period
          </div>
        ) : (
          <div className="space-y-1.5">
            {highRisk.slice(0, 4).map((c) => (
              <div key={c.courtId} className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-3 py-1.5">
                <span className="text-xs font-mono text-gray-600 truncate max-w-[120px]">
                  {c.courtId.slice(0, 8)}…
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs font-semibold text-red-700">{c.noShowRate}%</span>
                  <span className="text-[10px] text-gray-400">{c.noShows}/{c.totalBookings}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
