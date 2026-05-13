'use client';

import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/admin.api';
import type { MonthlyDataPoint } from '@/types/admin.types';

interface RevenueChartProps {
  data:       MonthlyDataPoint[];
  currency?:  string;
  isLoading?: boolean;
  isStub?:    boolean;
}

/**
 * RevenueChart — MRR sparkline widget.
 *
 * Renders a pure SVG polyline — no recharts / chart.js dependency needed
 * for a simple sparkline. The chart area is responsive via viewBox.
 *
 * Sprint 3: Replace with full recharts LineChart when billing is integrated.
 * Until then, renders tenant growth line (as a proxy for revenue trend).
 */
export function RevenueChart({
  data,
  currency = 'GBP',
  isLoading = false,
  isStub = false,
}: RevenueChartProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
        <div className="h-32 rounded bg-gray-100" />
      </div>
    );
  }

  const W = 400;
  const H = 100;
  const PAD = 10;

  // Use tenant count as proxy for growth line
  const values     = data.map((d) => d.tenantCount);
  const maxVal     = Math.max(...values, 1);
  const minVal     = Math.min(...values, 0);
  const range      = maxVal - minVal || 1;

  const points: [number, number][] = values.map((v, i) => [
    PAD + (i / Math.max(values.length - 1, 1)) * (W - PAD * 2),
    H - PAD - ((v - minVal) / range) * (H - PAD * 2),
  ]);

  const pathD = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  // Area fill path (close below the line)
  const areaD =
    pathD +
    ` L ${points[points.length - 1]![0].toFixed(1)} ${H - PAD}` +
    ` L ${points[0]![0].toFixed(1)} ${H - PAD} Z`;

  const latestTenants = data[data.length - 1]?.tenantCount ?? 0;
  const prevTenants   = data[data.length - 2]?.tenantCount ?? 0;
  const delta         = latestTenants - prevTenants;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Monthly Revenue (MRR)
            </p>
            {isStub && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Coming Sprint 3
              </span>
            )}
          </div>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {isStub ? '—' : formatCurrency(0, currency)}
          </p>
          {!isStub && (
            <p className="text-xs text-gray-400 mt-0.5">
              Billing integration pending
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Tenant growth</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{latestTenants}</p>
          {delta !== 0 && (
            <p className={cn('text-xs font-medium', delta > 0 ? 'text-emerald-600' : 'text-red-500')}>
              {delta > 0 ? '+' : ''}{delta} this month
            </p>
          )}
        </div>
      </div>

      {data.length > 1 ? (
        <div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-24"
            aria-label="Tenant growth trend chart"
            role="img"
          >
            <defs>
              <linearGradient id="tenantGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Area fill */}
            <path d={areaD} fill="url(#tenantGrad)" />
            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Data points */}
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="#3b82f6" />
            ))}
          </svg>

          {/* X-axis labels */}
          <div className="flex justify-between mt-1 px-2">
            {data.map((d) => (
              <span key={d.month} className="text-[10px] text-gray-400">
                {d.month.slice(5)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-24 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-400">Not enough data for trend</p>
        </div>
      )}
    </div>
  );
}
