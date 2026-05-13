'use client';

import { cn } from '@/lib/utils/cn';
import type { TrialStats, TrialAgeBucket } from '@/types/admin.types';

interface TrialWidgetProps {
  data:        TrialStats;
  periodDays:  number;
  isLoading?:  boolean;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ConversionGauge({ pct }: { pct: number | null }): React.ReactElement {
  const value   = pct ?? 0;
  // SVG arc gauge: half-circle, 0–100 mapped to 0–180deg
  const R       = 36;
  const STROKE  = 8;
  const CX      = 50;
  const CY      = 50;
  const CIRC    = Math.PI * R;       // half circumference

  const filled  = (value / 100) * CIRC;
  const empty   = CIRC - filled;

  const color   =
    value >= 60 ? '#10b981' :
    value >= 30 ? '#f59e0b' :
    '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width="100"
        height="58"
        viewBox="0 0 100 56"
        aria-label={`Conversion rate: ${pct !== null ? `${pct}%` : 'N/A'}`}
        role="img"
      >
        {/* Track */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`}
          fill="none"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${empty}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        {/* Value label */}
        <text
          x={CX} y={CY - 4}
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill="#111827"
        >
          {pct !== null ? `${pct}%` : '—'}
        </text>
        <text
          x={CX} y={CY + 10}
          textAnchor="middle"
          fontSize="8"
          fill="#9ca3af"
        >
          conversion
        </text>
      </svg>
    </div>
  );
}

function AgeBucketBar({ bucket, maxCount }: { bucket: TrialAgeBucket; maxCount: number }): React.ReactElement {
  const pct = maxCount > 0 ? Math.round((bucket.count / maxCount) * 100) : 0;

  const barColor =
    bucket.maxDays <= 7  ? '#6ee7b7' :
    bucket.maxDays <= 14 ? '#6ee7b7' :
    bucket.maxDays <= 30 ? '#fcd34d' :
    '#fca5a5';

  return (
    <div className="flex items-center gap-2.5">
      <span className="w-20 text-right text-xs text-gray-500 flex-shrink-0 tabular-nums">
        {bucket.label}
      </span>
      <div className="flex-1 h-4 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
          role="progressbar"
          aria-valuenow={bucket.count}
          aria-valuemax={maxCount}
          aria-label={`${bucket.label}: ${bucket.count}`}
        />
      </div>
      <span className="w-6 text-xs font-semibold text-gray-700 tabular-nums flex-shrink-0">
        {bucket.count}
      </span>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────

/**
 * TrialWidget — comprehensive trial funnel breakdown.
 *
 * Sections:
 *   Top row  : Total trials | Expiring soon (urgent flag if > 0) | Conversion gauge
 *   Bottom   : Age bucket horizontal bar chart
 *
 * Conversion rate = trials-that-became-active / (active + terminated) in period.
 * Expiring soon   = trials created 23–30 days ago (within 7d of assumed 30d window).
 */
export function TrialWidget({
  data,
  periodDays,
  isLoading = false,
}: TrialWidgetProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-24 rounded bg-gray-200 mb-4" />
        <div className="grid grid-cols-3 gap-4 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-gray-100 h-20" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const maxBucketCount = Math.max(...data.ageBuckets.map((b) => b.count), 1);
  const hasExpiring    = data.expiringSoon > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Trial Funnel
        </p>
        <span className="text-xs text-gray-400">{periodDays}d window</span>
      </div>

      <div className="p-5 flex flex-col gap-5">

        {/* Top KPI row */}
        <div className="grid grid-cols-3 gap-3">

          {/* Total trials */}
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{data.total}</p>
            <p className="text-xs text-blue-500 mt-0.5">active trials</p>
          </div>

          {/* Expiring soon */}
          <div className={cn(
            'rounded-lg p-3 text-center',
            hasExpiring ? 'bg-amber-50' : 'bg-gray-50',
          )}>
            <div className="flex items-center justify-center gap-1">
              {hasExpiring && (
                <svg className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              )}
              <p className={cn(
                'text-2xl font-bold',
                hasExpiring ? 'text-amber-700' : 'text-gray-500',
              )}>
                {data.expiringSoon}
              </p>
            </div>
            <p className={cn(
              'text-xs mt-0.5',
              hasExpiring ? 'text-amber-500' : 'text-gray-400',
            )}>
              expiring soon
            </p>
          </div>

          {/* Conversion gauge */}
          <div className="rounded-lg bg-gray-50 p-2 flex items-center justify-center">
            <ConversionGauge pct={data.conversionRatePct} />
          </div>
        </div>

        {/* Period conversion detail */}
        <div className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 text-xs">
          <span className="text-gray-500">This period</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" aria-hidden="true" />
              {data.convertedThisPeriod} converted
            </span>
            <span className="flex items-center gap-1.5 text-red-500 font-medium">
              <span className="h-2 w-2 rounded-full bg-red-300 inline-block" aria-hidden="true" />
              {data.expiredThisPeriod} expired
            </span>
          </div>
        </div>

        {/* Age bucket chart */}
        {data.ageBuckets.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-medium text-gray-500">Trial age distribution</p>
            {data.ageBuckets.map((bucket) => (
              <AgeBucketBar
                key={bucket.label}
                bucket={bucket}
                maxCount={maxBucketCount}
              />
            ))}
          </div>
        )}

        {data.ageBuckets.length === 0 && data.total === 0 && (
          <div className="flex items-center justify-center py-4">
            <p className="text-xs text-gray-400">No active trials</p>
          </div>
        )}
      </div>
    </div>
  );
}
