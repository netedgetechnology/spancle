'use client';

import { useQuery }             from '@tanstack/react-query';
import { cn }                   from '@/lib/utils/cn';
import {
  fetchOccupancy,
  fetchCancellations,
  fetchNoShows,
  analyticsKeys,
  formatMinor,
  nDaysAgo,
  todayString,
} from '@/lib/analytics.api';
import { fetchBranches, branchKeys } from '@/lib/branch.api';
import Link                          from 'next/link';

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label:      string;
  value:      string;
  sub?:       string;
  accentClass: string;
  href?:      string;
  isLoading?: boolean;
}

function KpiCard({ label, value, sub, accentClass, href, isLoading }: KpiCardProps) {
  const inner = (
    <div className={cn(
      'rounded-xl border-l-4 border border-gray-200 bg-white px-5 py-4 shadow-sm',
      'transition-shadow hover:shadow-md',
      accentClass,
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      {isLoading ? (
        <div className="mt-2 h-7 w-28 rounded bg-gray-100 animate-pulse" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-gray-900 leading-none">{value}</p>
      )}
      {sub && !isLoading && (
        <p className="mt-1 text-xs text-gray-400">{sub}</p>
      )}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

// ── Recent booking row ────────────────────────────────────────────────────────

function QuickLinkCard({ title, desc, href, icon }: { title: string; desc: string; href: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
        {icon}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage(): React.ReactElement {
  const today     = todayString();
  const todayRange = { from: today, to: today, granularity: 'day' as const };
  const weekRange  = { from: nDaysAgo(6), to: today, granularity: 'day' as const };

  const { data: todayOcc,   isLoading: occLoad  } = useQuery({
    queryKey: analyticsKeys.occupancy(todayRange),
    queryFn:  () => fetchOccupancy(todayRange),
    staleTime: 60_000,
  });

  const { data: weekOcc,    isLoading: woccLoad  } = useQuery({
    queryKey: analyticsKeys.occupancy(weekRange),
    queryFn:  () => fetchOccupancy(weekRange),
    staleTime: 60_000,
  });

  const { data: cancData,   isLoading: cancLoad  } = useQuery({
    queryKey: analyticsKeys.cancellations(weekRange),
    queryFn:  () => fetchCancellations(weekRange),
    staleTime: 60_000,
  });

  const { data: nsData,     isLoading: nsLoad    } = useQuery({
    queryKey: analyticsKeys.noShows(weekRange),
    queryFn:  () => fetchNoShows(weekRange),
    staleTime: 60_000,
  });

  const { data: branches,   isLoading: branchLoad } = useQuery({
    queryKey: branchKeys.list(),
    queryFn:  () => fetchBranches(),
    staleTime: 5 * 60_000,
  });

  // ── Occupancy mini bars (last 7 days) ────────────────────────────────────
  const periods = weekOcc?.byPeriod ?? [];
  const maxUtil = Math.max(1, ...periods.map((p) => p.utilizationPct));

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <p className="text-xs text-gray-400 mt-0.5">{today}</p>
        </div>
        <Link
          href="/analytics"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          Full analytics →
        </Link>
      </div>

      {/* Today KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Slots booked today"
          value={occLoad ? '…' : String(todayOcc?.totalBooked ?? 0)}
          sub={`of ${todayOcc?.totalSlots ?? 0} total`}
          accentClass="border-l-blue-500"
          href="/calendar"
          isLoading={occLoad}
        />
        <KpiCard
          label="Revenue today"
          value={occLoad ? '…' : formatMinor(todayOcc?.totalRevenueMinor ?? 0)}
          sub="from bookings"
          accentClass="border-l-purple-500"
          href="/analytics"
          isLoading={occLoad}
        />
        <KpiCard
          label="Cancellation rate (7d)"
          value={cancLoad ? '…' : `${cancData?.cancellationRate ?? 0}%`}
          sub={`${cancData?.totalCancellations ?? 0} cancelled`}
          accentClass="border-l-amber-400"
          href="/analytics"
          isLoading={cancLoad}
        />
        <KpiCard
          label="No-show rate (7d)"
          value={nsLoad ? '…' : `${nsData?.overallNoShowRate ?? 0}%`}
          sub={`${nsData?.highRiskCourts?.length ?? 0} high-risk courts`}
          accentClass="border-l-red-400"
          href="/analytics"
          isLoading={nsLoad}
        />
      </div>

      {/* 7-day occupancy mini chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">7-day occupancy</h3>
            <p className="text-xs text-gray-400">
              Avg {woccLoad ? '…' : `${weekOcc?.overallUtilizationPct ?? 0}%`} utilisation
            </p>
          </div>
          <span className="text-xs font-semibold text-purple-700">
            {woccLoad ? '…' : formatMinor(weekOcc?.totalRevenueMinor ?? 0)}
          </span>
        </div>

        {woccLoad ? (
          <div className="flex items-end gap-1 h-16 animate-pulse">
            {[1,2,3,4,5,6,7].map((i) => (
              <div key={i} className="flex-1 rounded-t bg-gray-100" style={{ height: `${20 + i * 10}%` }} />
            ))}
          </div>
        ) : periods.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">No data for this week</p>
        ) : (
          <div className="flex items-end gap-1 h-16">
            {periods.map((p) => {
              const h = Math.max(4, (p.utilizationPct / maxUtil) * 100);
              return (
                <div key={p.period} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      'w-full rounded-t transition-all',
                      p.utilizationPct >= 70 ? 'bg-emerald-500' :
                      p.utilizationPct >= 40 ? 'bg-blue-400' : 'bg-gray-200',
                    )}
                    style={{ height: `${h}%` }}
                    title={`${p.period.slice(5)}: ${p.utilizationPct}% (${p.bookedSlots} booked)`}
                  />
                  <span className="text-[9px] text-gray-400 leading-none">
                    {p.period.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick links + branches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Quick actions */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">Quick actions</h3>
          <QuickLinkCard
            title="View calendar"
            desc="Manage slot availability and bookings"
            href="/calendar"
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
          />
          <QuickLinkCard
            title="Manage courts"
            desc="Add or edit court configurations"
            href="/courts"
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>}
          />
          <QuickLinkCard
            title="Full analytics"
            desc="Occupancy, revenue, peak hours & more"
            href="/analytics"
            icon={<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
          />
        </div>

        {/* Branches summary */}
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
            Branches
            {!branchLoad && (
              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">
                {(branches ?? []).length}
              </span>
            )}
          </h3>
          {branchLoad ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (branches ?? []).length === 0 ? (
            <Link
              href="/branches/new"
              className="flex items-center justify-center rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 text-sm font-medium text-gray-400 hover:border-gray-300 hover:text-gray-500 transition-colors"
            >
              + Add your first branch
            </Link>
          ) : (
            <div className="space-y-1.5">
              {(branches ?? []).slice(0, 5).map((b) => (
                <Link
                  key={b.id}
                  href={`/branches/${b.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 hover:shadow-sm transition-shadow"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.name}</p>
                    <p className="text-[10px] text-gray-400">{b.city ?? b.slug}</p>
                  </div>
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    b.status === 'active'   ? 'bg-emerald-100 text-emerald-700' :
                    b.status === 'inactive' ? 'bg-gray-100 text-gray-500' :
                    'bg-amber-100 text-amber-700',
                  )}>
                    {b.status}
                  </span>
                </Link>
              ))}
              {(branches ?? []).length > 5 && (
                <Link href="/branches" className="text-xs text-blue-600 px-1 hover:underline">
                  View all {branches!.length} branches →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
