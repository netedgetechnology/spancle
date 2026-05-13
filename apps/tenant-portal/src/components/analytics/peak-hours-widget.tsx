'use client';

import { useQuery } from '@tanstack/react-query';
import { cn }       from '@/lib/utils/cn';
import { fetchPeakHours, analyticsKeys, type AnalyticsDateRange } from '@/lib/analytics.api';

interface PeakHoursWidgetProps {
  range: AnalyticsDateRange;
}

const DAY_LABELS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOUR_LABELS = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`); // 06–23

function intensityClass(pct: number): string {
  if (pct === 0)   return 'bg-gray-100 text-gray-300';
  if (pct < 20)    return 'bg-blue-100 text-blue-600';
  if (pct < 40)    return 'bg-blue-200 text-blue-700';
  if (pct < 60)    return 'bg-blue-400 text-white';
  if (pct < 80)    return 'bg-blue-600 text-white';
  return 'bg-blue-800 text-white';
}

export function PeakHoursWidget({ range }: PeakHoursWidgetProps): React.ReactElement {
  const { data, isLoading } = useQuery({
    queryKey: analyticsKeys.peakHours(range),
    queryFn:  () => fetchPeakHours(range),
    staleTime: 5 * 60_000,
  });

  // Build a map: day → hour → utilizationPct
  const heatmap = new Map<string, number>();
  (data?.heatmap ?? []).forEach((row) => {
    heatmap.set(`${row.dayOfWeek}-${row.hourOfDay}`, row.utilizationPct);
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Peak hours</h3>
          <p className="text-xs text-gray-400 mt-0.5">Demand heatmap by day × hour</p>
        </div>
        {!isLoading && data && (
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Busiest</p>
            <p className="text-xs font-semibold text-blue-700">
              {data.busiestDay} {data.busiestHourLabel}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 py-4 overflow-x-auto">
        {isLoading ? (
          <div className="animate-pulse space-y-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="flex gap-1">
                <div className="w-8 h-5 rounded bg-gray-100" />
                {HOUR_LABELS.map((h) => (
                  <div key={h} className="w-6 h-5 rounded bg-gray-100 flex-shrink-0" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="min-w-max">
            {/* Hour header */}
            <div className="flex gap-px mb-1">
              <div className="w-8" aria-hidden="true" />
              {HOUR_LABELS.map((h) => (
                <div key={h} className="w-6 flex-shrink-0 text-center text-[8px] text-gray-400 leading-none">
                  {h.slice(0, 2)}
                </div>
              ))}
            </div>

            {/* Rows: one per day */}
            {DAY_LABELS.map((dayLabel, dayIdx) => (
              <div key={dayLabel} className="flex gap-px mb-px">
                <div className="w-8 flex-shrink-0 text-[9px] font-medium text-gray-500 flex items-center">
                  {dayLabel}
                </div>
                {HOUR_LABELS.map((_, hourOffset) => {
                  const hour = 6 + hourOffset;
                  const pct  = heatmap.get(`${dayIdx}-${hour}`) ?? 0;
                  return (
                    <div
                      key={hour}
                      className={cn(
                        'w-6 h-5 rounded-sm flex-shrink-0 flex items-center justify-center',
                        'text-[8px] font-medium cursor-default transition-opacity hover:opacity-80',
                        intensityClass(pct),
                      )}
                      title={`${dayLabel} ${String(hour).padStart(2,'0')}:00 — ${pct}% utilisation`}
                      aria-label={`${dayLabel} ${hour}:00 utilisation ${pct}%`}
                    >
                      {pct >= 60 ? `${pct}` : ''}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              <span className="text-[10px] text-gray-400 mr-1">Low</span>
              {['bg-gray-100', 'bg-blue-100', 'bg-blue-200', 'bg-blue-400', 'bg-blue-600', 'bg-blue-800'].map((c) => (
                <span key={c} className={cn('h-3 w-5 rounded-sm', c)} aria-hidden="true" />
              ))}
              <span className="text-[10px] text-gray-400 ml-1">High</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
