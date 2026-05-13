'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import { fetchSport, updateSportStatus, deleteSport, sportKeys } from '@/lib/sport.api';
import { fetchBranch, branchKeys } from '@/lib/branch.api';
import {
  SPORT_STATUS_CONFIG,
  type SportStatus,
} from '@/types/sport.types';

/**
 * Sport detail page — /dashboard/sports/[id]
 *
 * Displays full sport detail:
 *   - Identity panel: name, slug, icon/colour, description
 *   - Configuration panel: all config fields
 *   - Branch assignment panel: list of assigned branches with their names
 *   - Status control: active ↔ inactive toggle
 *   - Meta: created, updated, ID
 */
export default function SportDetailPage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();

  const {
    data:      sport,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: sportKeys.detail(id),
    queryFn:  () => fetchSport(id),
    enabled:  !!id,
  });

  const statusMut = useMutation({
    mutationFn: (status: SportStatus) => updateSportStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(sportKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: sportKeys.list() });
      void queryClient.invalidateQueries({ queryKey: sportKeys.summary() });
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteSport(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sportKeys.all() });
      router.push('/sports');
    },
  });

  if (isLoading) return <PageLoader message="Loading sport…" />;
  if (error || !sport) {
    return (
      <ErrorDisplay
        title="Sport not found"
        message={(error as Error | undefined)?.message}
        retry={() => void refetch()}
      />
    );
  }

  const sc     = SPORT_STATUS_CONFIG[sport.status];
  const cfg    = sport.config;
  const isActive = sport.status === 'active';

  const configRows: { label: string; value: string }[] = [
    cfg.teamSize          != null && { label: 'Team size',        value: String(cfg.teamSize) },
    cfg.minPlayers        != null && { label: 'Min players',      value: String(cfg.minPlayers) },
    cfg.maxPlayers        != null && { label: 'Max players',      value: String(cfg.maxPlayers) },
    cfg.sessionDurationMins != null && { label: 'Session duration', value: `${cfg.sessionDurationMins} min` },
    cfg.scoringSystem && typeof cfg.scoringSystem === 'string' && { label: 'Scoring system', value: cfg.scoringSystem },
    cfg.notes && typeof cfg.notes === 'string' && { label: 'Notes', value: cfg.notes },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="flex flex-col gap-6">

      {/* Back + header */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/sports')}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 focus:outline-none"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to sports
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Colour + icon swatch */}
            <div
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl shadow-sm"
              style={{ backgroundColor: (sport.color ?? '#3b82f6') + '22' }}
              aria-hidden="true"
            >
              {sport.icon ?? '🏅'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-900">{sport.name}</h2>
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
                  sc.bg, sc.text, sc.ring,
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} aria-hidden="true" />
                  {sc.label}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{sport.slug}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push(`/sports/${id}/edit`)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit sport
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main column */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Description */}
          {sport.description && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">About</p>
              <p className="text-sm text-gray-800 leading-relaxed">{sport.description}</p>
            </div>
          )}

          {/* Configuration */}
          {(configRows.length > 0 || Array.isArray(cfg.ageGroups) || Array.isArray(cfg.equipment)) && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Configuration</p>
              <dl className="space-y-2.5">
                {configRows.map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-4 text-sm">
                    <dt className="text-gray-500 flex-shrink-0">{label}</dt>
                    <dd className="text-gray-900 font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>

              {Array.isArray(cfg.ageGroups) && (cfg.ageGroups as string[]).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Age groups</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(cfg.ageGroups as string[]).map((ag) => (
                      <span key={ag} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 capitalize">
                        {ag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(cfg.equipment) && (cfg.equipment as string[]).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Required equipment</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(cfg.equipment as string[]).map((e) => (
                      <span key={e} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 capitalize">
                        {e}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Branch assignment */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Branch availability
            </p>
            {sport.branchIds.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21" />
                </svg>
                <span className="font-medium">Available at all branches</span>
              </div>
            ) : (
              <div className="space-y-2">
                {sport.branchIds.map((branchId) => (
                  <BranchRow key={branchId} branchId={branchId} />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => router.push(`/sports/${id}/edit`)}
              className="mt-4 text-xs text-primary-600 hover:text-primary-700 hover:underline focus:outline-none"
            >
              Manage branch assignment →
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Status control */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
            <div className="flex flex-col gap-2">
              {(['active', 'inactive'] as SportStatus[]).map((s) => {
                const isCurrent = sport.status === s;
                const cfg2      = SPORT_STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isCurrent || statusMut.isPending}
                    onClick={() => statusMut.mutate(s)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
                      isCurrent
                        ? cn('border-2', cfg2.bg, cfg2.text, cfg2.ring)
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', cfg2.dot)} aria-hidden="true" />
                      {cfg2.label}
                    </span>
                    {isCurrent && <span className="text-xs font-semibold">Current</span>}
                  </button>
                );
              })}
            </div>

            {/* Delete — only when inactive */}
            {!isActive && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  disabled={deleteMut.isPending}
                  onClick={() => {
                    if (confirm(`Delete "${sport.name}"? This cannot be undone.`)) {
                      deleteMut.mutate();
                    }
                  }}
                  className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                >
                  {deleteMut.isPending ? 'Deleting…' : 'Delete sport'}
                </button>
              </div>
            )}
          </div>

          {/* Colour preview */}
          {sport.color && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Colour</p>
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-lg border border-gray-200 shadow-sm flex-shrink-0"
                  style={{ backgroundColor: sport.color }}
                  aria-hidden="true"
                />
                <span className="font-mono text-sm text-gray-700">{sport.color}</span>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Info</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-700">{new Date(sport.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Updated</dt>
                <dd className="text-gray-700">{new Date(sport.updatedAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Sport ID</dt>
                <dd className="font-mono text-gray-500 text-[10px]">{id.slice(0, 8)}…</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Sort order</dt>
                <dd className="text-gray-700">{sport.sortOrder}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * BranchRow — loads and displays a single branch by ID.
 * Uses a dedicated query so branch names are resolved individually.
 */
function BranchRow({ branchId }: { branchId: string }): React.ReactElement {
  const { data: branch, isLoading } = useQuery({
    queryKey: branchKeys.detail(branchId),
    queryFn:  () => fetchBranch(branchId),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <div className="h-3 w-3 rounded-full bg-gray-200" />
        <div className="h-3.5 w-28 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
      </svg>
      <span>{branch?.name ?? <span className="font-mono text-xs text-gray-400">{branchId.slice(0, 8)}…</span>}</span>
      {branch?.city && <span className="text-gray-400">· {branch.city}</span>}
    </div>
  );
}
