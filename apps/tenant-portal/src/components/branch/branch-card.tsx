'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { BranchStatusBadge } from './branch-status-badge';
import {
  STATUS_CONFIG,
  type Branch,
  type BranchStatus,
  formatAddress,
  openDaysCount,
} from '@/types/branch.types';

interface BranchCardProps {
  branch:         Branch;
  onStatusChange: (id: string, status: BranchStatus) => void;
  onDelete:       (id: string) => void;
  isUpdating?:    boolean;
}

const STATUS_ACTIONS: Record<BranchStatus, Array<{ label: string; to: BranchStatus }>> = {
  active:    [{ label: 'Set inactive', to: 'inactive' }, { label: 'Suspend', to: 'suspended' }, { label: 'Archive', to: 'archived' }],
  inactive:  [{ label: 'Activate', to: 'active' }, { label: 'Archive', to: 'archived' }],
  suspended: [{ label: 'Activate', to: 'active' }, { label: 'Archive', to: 'archived' }],
  archived:  [],
};

/**
 * BranchCard — card display for a single branch in the list view.
 *
 * Shows: name, slug, address, status badge, geo coordinates, open-day count,
 * manager indicator, facilities tags, and a contextual action menu.
 */
export function BranchCard({
  branch,
  onStatusChange,
  onDelete,
  isUpdating = false,
}: BranchCardProps): React.ReactElement {
  const router     = useRouter();
  const [open, setOpen] = useState(false);

  const actions     = STATUS_ACTIONS[branch.status] ?? [];
  const address     = formatAddress(branch);
  const daysOpen    = openDaysCount(branch.timings);
  const hasGeo      = branch.latitude != null && branch.longitude != null;

  return (
    <div className={cn(
      'relative rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden',
      branch.status === 'archived' && 'opacity-60',
    )}>
      {/* Status stripe */}
      <div
        className={cn('h-1 w-full', STATUS_CONFIG[branch.status].dot.replace('bg-', 'bg-'))}
        aria-hidden="true"
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-gray-900 truncate">{branch.name}</h3>
              <BranchStatusBadge status={branch.status} />
            </div>
            <p className="text-xs font-mono text-gray-400 mt-0.5">/{branch.slug}</p>
          </div>

          {/* Action menu */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={isUpdating}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none disabled:opacity-40"
              aria-label="Branch actions"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); router.push(`/branches/${branch.id}/edit`); }}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit details
                  </button>
                  {actions.map((a) => (
                    <button
                      key={a.to}
                      type="button"
                      onClick={() => { setOpen(false); onStatusChange(branch.id, a.to); }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {a.label}
                    </button>
                  ))}
                  {branch.status !== 'active' && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        if (confirm(`Delete "${branch.name}"? This cannot be undone.`)) {
                          onDelete(branch.id);
                        }
                      }}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Address */}
        {address && (
          <div className="flex items-start gap-2 mb-3">
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <p className="text-sm text-gray-600 leading-relaxed">{address}</p>
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {/* Geo */}
          {hasGeo && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              {branch.latitude?.toFixed(4)}, {branch.longitude?.toFixed(4)}
            </span>
          )}

          {/* Open days */}
          <span className="flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {daysOpen === 0 ? 'Closed all week' : `Open ${daysOpen}d/wk`}
          </span>

          {/* Manager */}
          {branch.managerUserId && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Manager assigned
            </span>
          )}

          {/* Phone */}
          {branch.phone && (
            <a
              href={`tel:${branch.phone}`}
              className="flex items-center gap-1 hover:text-primary-600"
              onClick={(e) => e.stopPropagation()}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 5.25v1.5z" />
              </svg>
              {branch.phone}
            </a>
          )}
        </div>

        {/* Facilities */}
        {branch.facilities && branch.facilities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
            {branch.facilities.slice(0, 5).map((f) => (
              <span
                key={f}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 capitalize"
              >
                {f.replace(/_/g, ' ')}
              </span>
            ))}
            {branch.facilities.length > 5 && (
              <span className="text-[11px] text-gray-400">
                +{branch.facilities.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Edit link */}
        <button
          type="button"
          onClick={() => router.push(`/branches/${branch.id}/edit`)}
          className="mt-4 w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none"
        >
          Edit branch
        </button>
      </div>
    </div>
  );
}
