'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { STATUS_COLORS, TIER_COLORS } from '@/types/admin.types';
import type { RecentTenant, TenantStatus } from '@/types/admin.types';
import { activateTenant, suspendTenant } from '@/lib/admin.api';

interface TenantTableProps {
  tenants:       RecentTenant[];
  isLoading?:    boolean;
  onActionDone?: () => void;
}

const STATUS_LABELS: Record<TenantStatus, string> = {
  active:     'Active',
  trial:      'Trial',
  suspended:  'Suspended',
  terminated: 'Terminated',
  pending:    'Pending',
};

const STATUS_BG: Record<TenantStatus, string> = {
  active:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  trial:      'bg-blue-50 text-blue-700 ring-blue-200',
  suspended:  'bg-amber-50 text-amber-700 ring-amber-200',
  terminated: 'bg-red-50 text-red-700 ring-red-200',
  pending:    'bg-purple-50 text-purple-700 ring-purple-200',
};

const TIER_LABELS: Record<string, string> = {
  free: 'Free', starter: 'Starter', growth: 'Growth', pro: 'Pro', enterprise: 'Enterprise',
};

/**
 * TenantTable — recent tenant widget for the superadmin dashboard.
 *
 * Displays the 10 most recently created tenants with:
 *   - Status badge (colour-coded by lifecycle state)
 *   - Tier badge (colour-coded by plan tier)
 *   - Relative creation date
 *   - Quick actions: Activate (pending/suspended), Suspend (active/trial)
 *   - Skeleton loading state matching exact row dimensions
 *
 * Actions call identity-service /tenants/:id/activate|suspend directly.
 * On success, calls onActionDone() to trigger parent query invalidation.
 */
export function TenantTable({
  tenants,
  isLoading = false,
  onActionDone,
}: TenantTableProps): React.ReactElement {
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleActivate = async (id: string): Promise<void> => {
    setActioningId(id);
    setActionError(null);
    try {
      await activateTenant(id);
      onActionDone?.();
    } catch {
      setActionError('Activation failed — check permissions');
    } finally {
      setActioningId(null);
    }
  };

  const handleSuspend = async (id: string, name: string): Promise<void> => {
    if (!confirm(`Suspend "${name}"? They will lose access immediately.`)) return;
    setActioningId(id);
    setActionError(null);
    try {
      await suspendTenant(id, 'Suspended by superadmin');
      onActionDone?.();
    } catch {
      setActionError('Suspension failed — check permissions');
    } finally {
      setActioningId(null);
    }
  };

  const relativeDate = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7)  return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Recent Tenants
        </p>
        {actionError && (
          <p className="text-xs text-red-600" role="alert">{actionError}</p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full" aria-label="Recent tenants">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tenant
              </th>
              <th className="hidden sm:table-cell px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Status
              </th>
              <th className="hidden md:table-cell px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Tier
              </th>
              <th className="hidden lg:table-cell px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Joined
              </th>
              <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-3">
                      <div className="h-4 w-32 rounded bg-gray-200 mb-1" />
                      <div className="h-3 w-20 rounded bg-gray-100" />
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3">
                      <div className="h-5 w-16 rounded-full bg-gray-200" />
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="h-5 w-14 rounded-full bg-gray-100" />
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <div className="h-3 w-12 rounded bg-gray-100" />
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              : tenants.map((t) => {
                  const isActioning = actioningId === t.id;
                  const canActivate = t.status === 'suspended' || t.status === 'pending';
                  const canSuspend  = t.status === 'active'    || t.status === 'trial';

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900 leading-none">
                          {t.name}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {t.slug}
                        </p>
                      </td>

                      <td className="hidden sm:table-cell px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                            STATUS_BG[t.status] ?? 'bg-gray-50 text-gray-600 ring-gray-200',
                          )}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[t.status] ?? '#9ca3af' }}
                            aria-hidden="true"
                          />
                          {STATUS_LABELS[t.status] ?? t.status}
                        </span>
                      </td>

                      <td className="hidden md:table-cell px-4 py-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: TIER_COLORS[t.tier] ?? '#e5e7eb',
                            color: t.tier === 'free' ? '#374151' : '#1f2937',
                          }}
                        >
                          {TIER_LABELS[t.tier] ?? t.tier}
                        </span>
                      </td>

                      <td className="hidden lg:table-cell px-4 py-3">
                        <time
                          dateTime={t.createdAt}
                          className="text-xs text-gray-500"
                          title={new Date(t.createdAt).toLocaleDateString()}
                        >
                          {relativeDate(t.createdAt)}
                        </time>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {isActioning ? (
                          <span className="text-xs text-gray-400">Processing…</span>
                        ) : canActivate ? (
                          <button
                            type="button"
                            onClick={() => void handleActivate(t.id)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline focus:outline-none"
                          >
                            Activate
                          </button>
                        ) : canSuspend ? (
                          <button
                            type="button"
                            onClick={() => void handleSuspend(t.id, t.name)}
                            className="text-xs font-medium text-amber-600 hover:text-amber-700 hover:underline focus:outline-none"
                          >
                            Suspend
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {!isLoading && tenants.length === 0 && (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-400">No tenants yet</p>
        </div>
      )}
    </div>
  );
}
