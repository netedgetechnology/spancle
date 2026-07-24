'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { StatCard }         from '@/components/dashboard/stat-card';
import { RevenueChart }     from '@/components/dashboard/revenue-chart';
import { TierBreakdown }    from '@/components/dashboard/tier-breakdown';
import { TenantTable }      from '@/components/dashboard/tenant-table';
import { BookingsSummary }  from '@/components/dashboard/bookings-summary';
import { TrialWidget }      from '@/components/dashboard/trial-widget';
import { SubscriptionsWidget } from '@/components/dashboard/subscriptions-widget';
import { SupportTickets }   from '@/components/dashboard/support-tickets';
import { ErrorDisplay }     from '@/components/ui/error-display';
import {
  fetchAdminStats,
  computeDelta,
  formatCurrency,
  adminKeys,
} from '@/lib/admin.api';
import type { DeltaDirection } from '@/types/admin.types';

const PERIOD_OPTIONS = [
  { label: '7 days',  value: 7  },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
] as const;

function deltaDirection(delta: number | null): DeltaDirection {
  if (delta === null || delta === 0) return 'neutral';
  return delta > 0 ? 'up' : 'down';
}

/**
 * SuperAdmin Dashboard — platform-wide KPI overview.
 *
 * Role guard: 403 panel if session role !== SUPER_ADMIN.
 * Backend SuperAdminGuard is the authoritative enforcement point.
 *
 * Responsive grid layout:
 *   Row 1 — 6 KPI stat cards  (1 → 2 → 3 → 6 columns)
 *   Row 2 — Revenue chart (2/3) + Tier donut (1/3)
 *   Row 3 — Trial funnel (1/2) + Subscriptions (1/2)
 *   Row 4 — Bookings summary (1/2) + Support tickets (1/2)
 *   Row 5 — Recent tenant table (full width)
 */
export default function SuperAdminDashboardPage(): React.ReactElement {
  const { data: session, status: sessionStatus } = useSession();
  const queryClient = useQueryClient();
  const [period, setPeriod]       = useState<7 | 30 | 90>(30);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // ── Role gate ────────────────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-64" aria-live="polite">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" aria-label="Loading session" />
      </div>
    );
  }

  const userRole =
    (session as unknown as Record<string, unknown> | null)?.role as string | undefined ??
    (session?.user as Record<string, string> | undefined)?.role;

  if (sessionStatus === 'authenticated' && userRole !== 'SUPER_ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-900">Access restricted</p>
        <p className="text-sm text-gray-500">
          This page requires <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">SUPER_ADMIN</span> role.
          {userRole && (
            <span> Your role: <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">{userRole}</span></span>
          )}
        </p>
      </div>
    );
  }

  // ── Query ────────────────────────────────────────────────────────────────

  const {
    data:      stats,
    isLoading,
    error,
    } = useQuery({
    queryKey: adminKeys.stats(period),
    queryFn:  () => fetchAdminStats(period),
    staleTime:       60_000,
    refetchInterval: 120_000,
  });

  const handleRefresh = useCallback(async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: adminKeys.stats(period) });
    setLastRefresh(new Date());
  }, [queryClient, period]);

  // ── KPI derivations ──────────────────────────────────────────────────────

  const newDelta  = stats ? computeDelta(stats.tenants.newThisPeriod, stats.tenants.previousPeriod) : null;
  const mrrDelta  = stats ? computeDelta(stats.revenue.mrrMinorUnits, stats.revenue.previousMrrMinorUnits) : null;

  const kpiCards = [
    {
      label:     'Total Tenants',
      value:     stats?.tenants.total ?? 0,
      delta:     undefined,
      direction: 'neutral' as DeltaDirection,
    },
    {
      label:     `New (${period}d)`,
      value:     stats?.tenants.newThisPeriod ?? 0,
      delta:     newDelta ?? undefined,
      direction: deltaDirection(newDelta),
    },
    {
      label:     'Active',
      value:     stats?.tenants.active ?? 0,
      delta:     undefined,
      direction: 'neutral' as DeltaDirection,
    },
    {
      label:     'Trial',
      value:     stats?.tenants.trial ?? 0,
      delta:     undefined,
      direction: 'neutral' as DeltaDirection,
    },
    {
      label:     'Suspended',
      value:     stats?.tenants.suspended ?? 0,
      delta:     undefined,
      direction: 'neutral' as DeltaDirection,
    },
    {
      label:     'MRR',
      value:     stats ? formatCurrency(stats.revenue.mrrMinorUnits, stats.revenue.currency) : '—',
      delta:     mrrDelta ?? undefined,
      direction: deltaDirection(mrrDelta),
      isStub:    true,
    },
  ];

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message={(error as Error).message}
        retry={() => void handleRefresh()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Platform Overview</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Refreshed{' '}
            <time dateTime={lastRefresh.toISOString()}>
              {lastRefresh.toLocaleTimeString(undefined, { timeStyle: 'short' })}
            </time>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPeriod(opt.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                  period === opt.value
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Refresh dashboard"
          >
            <svg
              className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Row 1 — KPI cards */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        role="region"
        aria-label="Key metrics"
      >
        {kpiCards.map((card) => (
          <StatCard
            key={card.label}
            label={card.label}
            value={card.value}
            delta={card.delta}
            direction={card.direction}
            isStub={card.isStub}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* Row 2 — Revenue chart + Tier donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart
            data={stats?.monthlyTrend ?? []}
            currency={stats?.revenue.currency}
            isLoading={isLoading}
            isStub={stats?.revenue.isStub}
          />
        </div>
        <TierBreakdown
          data={stats?.tierBreakdown ?? []}
          isLoading={isLoading}
        />
      </div>

      {/* Row 3 — Trial funnel + Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TrialWidget
          data={stats?.trialStats ?? {
            total: 0, expiringSoon: 0, convertedThisPeriod: 0,
            expiredThisPeriod: 0, conversionRatePct: null, ageBuckets: [],
          }}
          periodDays={period}
          isLoading={isLoading}
        />
        <SubscriptionsWidget
          data={stats?.subscriptionStats ?? {
            totalPaying: 0, newThisPeriod: 0, churnedThisPeriod: 0,
            churnRatePct: null, byTier: [], isProxy: true,
          }}
          periodDays={period}
          isLoading={isLoading}
        />
      </div>

      {/* Row 4 — Bookings + Support */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BookingsSummary
          data={stats?.bookings ?? {
            totalThisPeriod: 0, confirmedThisPeriod: 0,
            cancelledThisPeriod: 0, isStub: true,
          }}
          periodDays={period}
          isLoading={isLoading}
        />
        <SupportTickets
          data={stats?.supportTickets ?? { open: 0, pending: 0, resolved: 0, isStub: true }}
          isLoading={isLoading}
        />
      </div>

      {/* Row 5 — Recent tenants table */}
      <TenantTable
        tenants={stats?.recentTenants ?? []}
        isLoading={isLoading}
        onActionDone={() => void handleRefresh()}
      />

    </div>
  );
}
