'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }           from '@/lib/utils/cn';
import { SportCard }    from '@/components/sport/sport-card';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchSports,
  fetchSportStatusSummary,
  updateSportStatus,
  deleteSport,
  sportKeys,
} from '@/lib/sport.api';
import type { SportStatus } from '@/types/sport.types';

const FILTER_TABS: { label: string; value: SportStatus | 'all' }[] = [
  { label: 'All',      value: 'all'      },
  { label: 'Active',   value: 'active'   },
  { label: 'Inactive', value: 'inactive' },
];

/**
 * Sports list page — /dashboard/sports
 *
 * Displays all sports in a responsive card grid, filterable by status.
 * Features:
 *   - Status filter tabs with live counts
 *   - Quick status toggle (active ↔ inactive) via card action menu
 *   - Soft delete (blocked for active sports at API level)
 *   - Unlimited sports — no pagination needed until >50 per tenant (Sprint 3)
 */
export default function SportsListPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SportStatus | 'all'>('all');

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: sportKeys.all() });
  };

  const { data: summary = { active: 0, inactive: 0 } } = useQuery({
    queryKey: sportKeys.summary(),
    queryFn:  fetchSportStatusSummary,
  });

  const {
    data:      sports = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: sportKeys.list(activeTab === 'all' ? undefined : activeTab),
    queryFn:  () => fetchSports(activeTab === 'all' ? undefined : activeTab as SportStatus),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SportStatus }) =>
      updateSportStatus(id, status),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: deleteSport,
    onSuccess:  invalidate,
  });

  const handleDelete = (id: string, name: string): void => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteMut.mutate(id);
  };

  const isBusy  = statusMut.isPending || deleteMut.isPending;
  const total   = summary.active + summary.inactive;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Sports</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} sport{total !== 1 ? 's' : ''} · unlimited
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/sports/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New sport
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 w-fit">
        {FILTER_TABS.map((tab) => {
          const count =
            tab.value === 'all'
              ? total
              : (summary[tab.value as SportStatus] ?? 0);

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.label}
              <span className={cn(
                'rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                activeTab === tab.value
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-200 text-gray-500',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader message="Loading sports…" />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load sports"
          message={(error as Error).message}
          retry={() => void refetch()}
        />
      ) : sports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <span className="text-4xl" aria-hidden="true">🏅</span>
          </div>
          <p className="text-sm font-medium text-gray-600">
            {activeTab === 'all' ? 'No sports yet' : `No ${activeTab} sports`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === 'all'
              ? 'Add your first sport or activity to get started'
              : 'Try a different filter'}
          </p>
          {activeTab === 'all' && (
            <button
              type="button"
              onClick={() => router.push('/sports/new')}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Add first sport
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {sports.map((sport) => (
            <SportCard
              key={sport.id}
              sport={sport}
              onStatusChange={(id, status) => statusMut.mutate({ id, status })}
              onDelete={handleDelete}
              isUpdating={isBusy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
