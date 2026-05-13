'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { BranchCard }        from '@/components/branch/branch-card';
import { PageLoader }        from '@/components/ui/page-loader';
import { ErrorDisplay }      from '@/components/ui/error-display';
import {
  fetchBranches,
  fetchStatusSummary,
  updateBranchStatus,
  deleteBranch,
  branchKeys,
} from '@/lib/branch.api';
import type { BranchStatus } from '@/types/branch.types';
import { useToast }          from '@spancle/ui-kit';

const FILTER_TABS: { label: string; value: BranchStatus | 'all' }[] = [
  { label: 'All',       value: 'all'       },
  { label: 'Active',    value: 'active'    },
  { label: 'Inactive',  value: 'inactive'  },
  { label: 'Suspended', value: 'suspended' },
  { label: 'Archived',  value: 'archived'  },
];

/**
 * Branch list page — /dashboard/branches
 *
 * Displays all branches in a responsive card grid.
 * Features:
 *   - Status filter tabs with live counts
 *   - Quick status change via card action menu
 *   - Soft delete (blocked for active branches at API level)
 *   - Create branch button
 */
export default function BranchListPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { toast }   = useToast();
  const [activeTab, setActiveTab] = useState<BranchStatus | 'all'>('all');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: branchKeys.all() });
  };

  const { data: summary = { active: 0, inactive: 0, suspended: 0, archived: 0 } } = useQuery({
    queryKey: branchKeys.summary(),
    queryFn:  fetchStatusSummary,
  });

  const {
    data:      branches = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: branchKeys.list(activeTab === 'all' ? undefined : activeTab),
    queryFn:  () => fetchBranches(activeTab === 'all' ? undefined : activeTab),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BranchStatus }) =>
      updateBranchStatus(id, status),
    onSuccess: () => { invalidate(); toast({ title: 'Status updated', intent: 'success' }); },
    onError:   (e: Error) => toast({ title: 'Failed to update status', description: e.message, intent: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => { invalidate(); toast({ title: 'Branch deleted', intent: 'success' }); },
    onError:   (e: Error) => toast({ title: 'Delete failed', description: e.message, intent: 'error' }),
  });

  const isBusy = statusMutation.isPending || deleteMutation.isPending;
  const total  = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Branches</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} branch{total !== 1 ? 'es' : ''} across your organisation
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/branches/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New branch
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'all' ? total : summary[tab.value] ?? 0;
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
                activeTab === tab.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-500',
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <PageLoader message="Loading branches…" />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load branches"
          message={(error as Error).message}
          retry={() => void refetch()}
        />
      ) : branches.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">
            {activeTab === 'all' ? 'No branches yet' : `No ${activeTab} branches`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === 'all'
              ? 'Create your first branch to get started'
              : 'Try switching to a different filter'}
          </p>
          {activeTab === 'all' && (
            <button
              type="button"
              onClick={() => router.push('/branches/new')}
              className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Add first branch
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map((branch) => (
            <BranchCard
              key={branch.id}
              branch={branch}
              onStatusChange={(id, status) => statusMutation.mutate({ id, status })}
              onDelete={(id) => deleteMutation.mutate(id)}
              isUpdating={isBusy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
