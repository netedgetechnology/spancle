'use client';

import { cn } from '@/lib/utils/cn';
import { TIER_COLORS } from '@/types/admin.types';
import type { SubscriptionStats, SubscriptionByTier } from '@/types/admin.types';

interface SubscriptionsWidgetProps {
  data:        SubscriptionStats;
  periodDays:  number;
  isLoading?:  boolean;
}

const TIER_ORDER = ['enterprise', 'pro', 'growth', 'starter'] as const;

const TIER_LABELS: Record<string, string> = {
  enterprise: 'Enterprise',
  pro:        'Pro',
  growth:     'Growth',
  starter:    'Starter',
};

function TierRow({
  row,
  total,
}: {
  row:   SubscriptionByTier;
  total: number;
}): React.ReactElement {
  const pct   = total > 0 ? Math.round((row.count / total) * 100) : 0;
  const color = TIER_COLORS[row.tier] ?? '#e5e7eb';

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span
        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="text-sm text-gray-700 flex-1">
        {TIER_LABELS[row.tier] ?? row.tier}
      </span>

      {/* Mini bar */}
      <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={row.count}
          aria-valuemax={total}
        />
      </div>

      <span className="text-sm font-semibold text-gray-900 tabular-nums w-8 text-right">
        {row.count}
      </span>
      <span className="text-xs text-gray-400 tabular-nums w-9 text-right">
        {pct}%
      </span>
    </div>
  );
}

/**
 * SubscriptionsWidget — paying subscriber summary.
 *
 * Shows:
 *   Top     : Total paying | New this period | Churned this period
 *   Middle  : Churn rate indicator (colour-coded)
 *   Bottom  : Breakdown by tier with proportional mini-bars
 *
 * Data is derived from tenant tier+status (proxy until billing service).
 * The isProxy badge is always visible so operators understand the data source.
 */
export function SubscriptionsWidget({
  data,
  periodDays,
  isLoading = false,
}: SubscriptionsWidgetProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-200 mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg bg-gray-100 h-16" />
          ))}
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-5 rounded bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const churnColor =
    (data.churnRatePct ?? 0) === 0  ? 'text-gray-400' :
    (data.churnRatePct ?? 0) < 3   ? 'text-emerald-600' :
    (data.churnRatePct ?? 0) < 8   ? 'text-amber-600' :
    'text-red-600';

  const churnBg =
    (data.churnRatePct ?? 0) === 0  ? 'bg-gray-50'      :
    (data.churnRatePct ?? 0) < 3   ? 'bg-emerald-50'   :
    (data.churnRatePct ?? 0) < 8   ? 'bg-amber-50'     :
    'bg-red-50';

  // Merge data with display order — show all 4 tiers even if count is 0
  const orderedTiers: SubscriptionByTier[] = TIER_ORDER.map(
    (t) => data.byTier.find((r) => r.tier === t) ?? { tier: t, count: 0, mrrMinorUnits: 0 },
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Subscriptions
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{periodDays}d window</span>
          {data.isProxy && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-600">
              Tenant proxy
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-4">

        {/* Top KPI row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-indigo-50 p-3 text-center">
            <p className="text-2xl font-bold text-indigo-700">
              {data.totalPaying.toLocaleString()}
            </p>
            <p className="text-xs text-indigo-400 mt-0.5">paying</p>
          </div>

          <div className="rounded-lg bg-emerald-50 p-3 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-xs text-emerald-500 font-medium">+</span>
              <p className="text-2xl font-bold text-emerald-700">{data.newThisPeriod}</p>
            </div>
            <p className="text-xs text-emerald-500 mt-0.5">new</p>
          </div>

          <div className="rounded-lg bg-red-50 p-3 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <span className="text-xs text-red-400 font-medium">−</span>
              <p className="text-2xl font-bold text-red-600">{data.churnedThisPeriod}</p>
            </div>
            <p className="text-xs text-red-400 mt-0.5">churned</p>
          </div>
        </div>

        {/* Churn rate banner */}
        <div className={cn(
          'flex items-center justify-between rounded-lg px-4 py-2.5',
          churnBg,
        )}>
          <span className="text-xs text-gray-500">Churn rate</span>
          <span className={cn('text-sm font-bold tabular-nums', churnColor)}>
            {data.churnRatePct !== null ? `${data.churnRatePct}%` : '—'}
          </span>
        </div>

        {/* Tier breakdown */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">By tier</p>
          <div className="divide-y divide-gray-50">
            {orderedTiers.map((row) => (
              <TierRow
                key={row.tier}
                row={row}
                total={data.totalPaying}
              />
            ))}
          </div>
        </div>

        {/* Proxy disclaimer */}
        {data.isProxy && (
          <p className="text-[10px] text-gray-400 leading-relaxed border-t border-gray-100 pt-3">
            Derived from tenant tier & status. Dedicated billing schema in Sprint 3.
          </p>
        )}
      </div>
    </div>
  );
}
