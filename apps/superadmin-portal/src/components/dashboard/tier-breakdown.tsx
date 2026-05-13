'use client';

import { TIER_COLORS } from '@/types/admin.types';
import type { TierCount } from '@/types/admin.types';

interface TierBreakdownProps {
  data:       TierCount[];
  isLoading?: boolean;
}

const TIER_ORDER = ['enterprise', 'pro', 'growth', 'starter', 'free'] as const;

const TIER_LABELS: Record<string, string> = {
  free:       'Free',
  starter:    'Starter',
  growth:     'Growth',
  pro:        'Pro',
  enterprise: 'Enterprise',
};

/**
 * TierBreakdown — donut chart widget.
 *
 * Renders a pure SVG donut + legend showing the distribution of active
 * tenants across the 5 plan tiers. No chart library dependency.
 *
 * SVG technique: strokeDasharray + strokeDashoffset on a single circle
 * path, one segment per tier, stacked by rotating via stroke-dashoffset.
 */
export function TierBreakdown({
  data,
  isLoading = false,
}: TierBreakdownProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-28 rounded bg-gray-200 mb-4" />
        <div className="flex gap-6 items-center">
          <div className="h-32 w-32 rounded-full bg-gray-100 flex-shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 rounded bg-gray-100" style={{ width: `${60 + i * 8}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  // Sort by tier order, merge unknown tiers at end
  const sorted = [...TIER_ORDER]
    .map((t) => data.find((d) => d.tier === t) ?? { tier: t, count: 0 })
    .concat(data.filter((d) => !TIER_ORDER.includes(d.tier as typeof TIER_ORDER[number])));

  const nonZero = sorted.filter((d) => d.count > 0);

  // SVG donut geometry
  const CX = 60;
  const CY = 60;
  const R  = 45;           // radius
  const SW = 18;           // stroke width (ring thickness)
  const CIRC = 2 * Math.PI * R;

  // Compute dash segments
  let cumulative = 0;
  const segments = nonZero.map((d) => {
    const pct    = total > 0 ? d.count / total : 0;
    const dash   = pct * CIRC;
    const offset = CIRC - cumulative * CIRC;
    cumulative  += pct;
    return { ...d, dash, offset, pct };
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-4">
        Tier Distribution
      </p>

      {total === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-gray-400">No tenant data</p>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          {/* Donut */}
          <div className="flex-shrink-0 relative">
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              aria-label="Tier distribution donut chart"
              role="img"
            >
              {/* Background track */}
              <circle
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth={SW}
              />
              {/* Segments */}
              {segments.map((seg) => (
                <circle
                  key={seg.tier}
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={TIER_COLORS[seg.tier] ?? '#d1d5db'}
                  strokeWidth={SW}
                  strokeDasharray={`${seg.dash} ${CIRC - seg.dash}`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${CX} ${CY})`}
                />
              ))}
              {/* Centre label */}
              <text
                x={CX} y={CY - 5}
                textAnchor="middle"
                className="text-2xl font-bold"
                fontSize="20"
                fontWeight="700"
                fill="#111827"
              >
                {total}
              </text>
              <text
                x={CX} y={CY + 12}
                textAnchor="middle"
                fontSize="9"
                fill="#9ca3af"
              >
                tenants
              </text>
            </svg>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {sorted.map((d) => {
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <div key={d.tier} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: TIER_COLORS[d.tier] ?? '#d1d5db' }}
                      aria-hidden="true"
                    />
                    <span className="text-xs text-gray-600 truncate">
                      {TIER_LABELS[d.tier] ?? d.tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-semibold text-gray-900 tabular-nums w-6 text-right">
                      {d.count}
                    </span>
                    <span className="text-xs text-gray-400 tabular-nums w-9 text-right">
                      {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
