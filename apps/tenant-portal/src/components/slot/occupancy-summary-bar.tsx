'use client';

import { cn } from '@/lib/utils/cn';
import type { OccupancySummary } from '@/types/slot.types';

interface OccupancySummaryBarProps {
  summary:   OccupancySummary;
  isLoading?: boolean;
}

const SEGMENTS = [
  { key: 'available'   as const, label: 'Available',   color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  { key: 'reserved'    as const, label: 'Reserved',    color: 'bg-amber-400',   textColor: 'text-amber-700'   },
  { key: 'booked'      as const, label: 'Booked',      color: 'bg-blue-500',    textColor: 'text-blue-700'    },
  { key: 'completed'   as const, label: 'Completed',   color: 'bg-slate-400',   textColor: 'text-slate-600'   },
  { key: 'unavailable' as const, label: 'Unavailable', color: 'bg-red-300',     textColor: 'text-red-600'     },
  { key: 'cancelled'   as const, label: 'Cancelled',   color: 'bg-gray-300',    textColor: 'text-gray-500'    },
];

/**
 * OccupancySummaryBar — shows the breakdown of slot statuses for the selected day.
 *
 * Two display elements:
 *   1. Stacked proportional bar — each status a coloured segment
 *   2. Stat pills — count + % per status
 *
 * Plus a utilisation rate badge top-right.
 */
export function OccupancySummaryBar({
  summary,
  isLoading = false,
}: OccupancySummaryBarProps): React.ReactElement {
  const active = summary.total - summary.cancelled;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 animate-pulse">
        <div className="h-3 w-full rounded-full bg-gray-100 mb-3" />
        <div className="flex gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="h-4 w-20 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  if (summary.total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-center">
        <p className="text-xs text-gray-400">No slots for this day — generate slots to see occupancy</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Occupancy — {summary.total} slots
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{active} active</span>
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-bold',
            summary.utilizationPct >= 80 ? 'bg-blue-100 text-blue-800' :
            summary.utilizationPct >= 50 ? 'bg-amber-100 text-amber-800' :
            'bg-gray-100 text-gray-600',
          )}>
            {summary.utilizationPct}% utilised
          </span>
        </div>
      </div>

      {/* Stacked proportional bar */}
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-gray-100 gap-px mb-3"
        role="img"
        aria-label={`Occupancy: ${summary.utilizationPct}% utilised`}
      >
        {SEGMENTS.map(({ key, color }) => {
          const count = summary[key];
          if (count === 0 || summary.total === 0) return null;
          const pct = (count / summary.total) * 100;
          return (
            <div
              key={key}
              className={cn('h-full flex-shrink-0 transition-all duration-300', color)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      {/* Stat pills */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {SEGMENTS.map(({ key, label, color, textColor }) => {
          const count = summary[key];
          if (count === 0) return null;
          const pct = active > 0 && key !== 'cancelled'
            ? Math.round((count / active) * 100)
            : null;

          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', color)} aria-hidden="true" />
              <span className={cn('text-xs font-medium', textColor)}>
                {count} {label}
              </span>
              {pct !== null && (
                <span className="text-[10px] text-gray-400">({pct}%)</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
