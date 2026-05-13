'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BranchStatusBadge } from '@/components/branch/branch-status-badge';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchBranch,
  updateBranchStatus,
  branchKeys,
} from '@/lib/branch.api';
import {
  STATUS_CONFIG,
  DAY_KEYS,
  DAY_LABELS,
  formatAddress,
  type BranchStatus,
} from '@/types/branch.types';
import { cn } from '@/lib/utils/cn';
import { useToast } from '@spancle/ui-kit';

/**
 * Branch detail page — /dashboard/branches/[id]
 *
 * Displays full branch detail: identity, address, geo, contact,
 * opening hours table, facilities, and status change controls.
 */
export default function BranchDetailPage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  const {
    data:      branch,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: branchKeys.detail(id),
    queryFn:  () => fetchBranch(id),
    enabled:  !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: BranchStatus) => updateBranchStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(branchKeys.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: branchKeys.list() });
      queryClient.invalidateQueries({ queryKey: branchKeys.summary() });
      toast({ title: 'Status updated', intent: 'success' });
    },
    onError: (err: Error) => {
      toast({ title: 'Failed to update status', description: err.message, intent: 'error' });
    },
  });

  if (isLoading) return <PageLoader message="Loading branch…" />;
  if (error || !branch) {
    return (
      <ErrorDisplay
        title="Branch not found"
        message={(error as Error | undefined)?.message}
        retry={() => void refetch()}
      />
    );
  }

  const hasGeo = branch.latitude != null && branch.longitude != null;

  return (
    <div className="flex flex-col gap-6">

      {/* Back + header */}
      <div>
        <button
          type="button"
          onClick={() => router.push('/branches')}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to branches
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-gray-900">{branch.name}</h2>
              <BranchStatusBadge status={branch.status} size="md" />
            </div>
            <p className="text-xs font-mono text-gray-400 mt-0.5">/{branch.slug}</p>
            {branch.description && (
              <p className="text-sm text-gray-600 mt-1">{branch.description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => router.push(`/branches/${id}/edit`)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Edit branch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main detail card */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Address + Geo */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Location</p>
            <p className="text-sm text-gray-800">{formatAddress(branch)}</p>

            {hasGeo && (
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <span className="font-mono">
                  {branch.latitude?.toFixed(6)}, {branch.longitude?.toFixed(6)}
                </span>
                {branch.geoLabel && <span className="text-gray-500">— {branch.geoLabel}</span>}
              </div>
            )}

            {branch.mapUrl && (
              <a
                href={branch.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
              >
                Open in maps
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            )}
          </div>

          {/* Contact */}
          {(branch.phone || branch.email || branch.website) && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</p>
              <dl className="space-y-2 text-sm">
                {branch.phone && (
                  <div className="flex gap-3">
                    <dt className="text-gray-400 w-16 flex-shrink-0">Phone</dt>
                    <dd><a href={`tel:${branch.phone}`} className="text-gray-800 hover:text-primary-600">{branch.phone}</a></dd>
                  </div>
                )}
                {branch.email && (
                  <div className="flex gap-3">
                    <dt className="text-gray-400 w-16 flex-shrink-0">Email</dt>
                    <dd><a href={`mailto:${branch.email}`} className="text-gray-800 hover:text-primary-600">{branch.email}</a></dd>
                  </div>
                )}
                {branch.website && (
                  <div className="flex gap-3">
                    <dt className="text-gray-400 w-16 flex-shrink-0">Website</dt>
                    <dd><a href={branch.website} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:text-primary-600 underline">{branch.website}</a></dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Opening hours table */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Opening hours</p>
            <dl className="space-y-1.5">
              {DAY_KEYS.map((day) => {
                const t = branch.timings[day];
                return (
                  <div key={day} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                    <dt className="font-medium text-gray-700 w-10">{DAY_LABELS[day]}</dt>
                    <dd className={cn('text-right', t.isClosed ? 'text-gray-400 italic' : 'text-gray-800 font-mono')}>
                      {t.isClosed ? 'Closed' : `${t.openTime} – ${t.closeTime}`}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {/* Facilities */}
          {branch.facilities && branch.facilities.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Facilities</p>
              <div className="flex flex-wrap gap-2">
                {branch.facilities.map((f) => (
                  <span key={f} className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-blue-700 capitalize">
                    {f.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">

          {/* Status control */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status</p>
            <div className="flex flex-col gap-2">
              {(['active', 'inactive', 'suspended', 'archived'] as BranchStatus[]).map((s) => {
                const isCurrent  = branch.status === s;
                const isArchived = branch.status === 'archived';
                const cfg        = STATUS_CONFIG[s];

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isCurrent || isArchived || statusMutation.isPending}
                    onClick={() => statusMutation.mutate(s)}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
                      isCurrent
                        ? cn('border-2', cfg.bg, cfg.text, cfg.ringBg)
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', cfg.dot)} aria-hidden="true" />
                      {cfg.label}
                    </span>
                    {isCurrent && (
                      <span className="text-xs font-semibold">Current</span>
                    )}
                  </button>
                );
              })}
              {branch.status === 'archived' && (
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Archived branches cannot be reactivated.
                </p>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Info</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-gray-400">Created</dt>
                <dd className="text-gray-700">{new Date(branch.createdAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Last updated</dt>
                <dd className="text-gray-700">{new Date(branch.updatedAt).toLocaleDateString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-400">Branch ID</dt>
                <dd className="font-mono text-gray-500 text-[10px]">{id.slice(0, 8)}…</dd>
              </div>
              {branch.managerUserId && (
                <div className="flex justify-between">
                  <dt className="text-gray-400">Manager ID</dt>
                  <dd className="font-mono text-gray-500 text-[10px]">{branch.managerUserId.slice(0, 8)}…</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
