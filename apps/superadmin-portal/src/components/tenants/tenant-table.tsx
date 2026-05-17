'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { TenantStatusBadge } from './tenant-status-badge';
import {
  fetchTenantList, activateTenant, suspendTenant, terminateTenant,
  tenantKeys,
} from '@/lib/tenants.api';
import type { TenantListParams } from '@/lib/tenants.api';
import type { TenantDetail } from '@/types/tenant-detail.types';
import { TIER_LABELS } from '@/types/tenant-detail.types';
import type { TenantStatus, TenantTier } from '@/types/admin.types';
import { cn } from '@/lib/utils/cn';

const STATUS_OPTIONS: { value: TenantStatus | ''; label: string }[] = [
  { value: '',           label: 'All statuses' },
  { value: 'active',     label: 'Active'        },
  { value: 'trial',      label: 'Trial'         },
  { value: 'suspended',  label: 'Suspended'     },
  { value: 'terminated', label: 'Terminated'    },
  { value: 'pending',    label: 'Pending'       },
];

const TIER_OPTIONS: { value: TenantTier | ''; label: string }[] = [
  { value: '',           label: 'All tiers'  },
  { value: 'free',       label: 'Free'       },
  { value: 'starter',    label: 'Starter'    },
  { value: 'growth',     label: 'Growth'     },
  { value: 'pro',        label: 'Pro'        },
  { value: 'enterprise', label: 'Enterprise' },
];

interface ActionMenuProps {
  tenant:    TenantDetail;
  onRefresh: () => void;
}

function ActionMenu({ tenant, onRefresh }: ActionMenuProps): React.ReactElement {
  const [open,    setOpen]    = useState(false);
  const [reason,  setReason]  = useState('');
  const [confirm, setConfirm] = useState<'suspend' | 'terminate' | null>(null);
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: tenantKeys.all() });
    onRefresh();
    setOpen(false);
  };

  const activate  = useMutation({ mutationFn: () => activateTenant(tenant.id),          onSuccess: invalidate });
  const suspend   = useMutation({ mutationFn: () => suspendTenant(tenant.id, reason),   onSuccess: invalidate });
  const terminate = useMutation({ mutationFn: () => terminateTenant(tenant.id, reason), onSuccess: invalidate });

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Tenant actions"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <Link
              href={`/tenants/${tenant.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              View / Edit
            </Link>

            {(tenant.status === 'suspended' || tenant.status === 'pending' || tenant.status === 'trial') && (
              <button
                type="button"
                onClick={() => { activate.mutate(); }}
                disabled={activate.isPending}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
              >
                {activate.isPending ? 'Activating…' : 'Activate'}
              </button>
            )}

            {tenant.status === 'active' && (
              <button
                type="button"
                onClick={() => setConfirm('suspend')}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50"
              >
                Suspend
              </button>
            )}

            {tenant.status !== 'terminated' && (
              <button
                type="button"
                onClick={() => setConfirm('terminate')}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                Terminate
              </button>
            )}
          </div>
        </>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-gray-900 capitalize">
              {confirm} tenant — {tenant.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500">This action will be logged. Provide a reason.</p>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason…"
              rows={3}
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setConfirm(null); setReason(''); setOpen(false); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim() || suspend.isPending || terminate.isPending}
                onClick={() => {
                  if (confirm === 'suspend')   suspend.mutate();
                  if (confirm === 'terminate') terminate.mutate();
                  setConfirm(null);
                  setReason('');
                }}
                className={cn(
                  'rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50',
                  confirm === 'terminate' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700',
                )}
              >
                Confirm {confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TenantTable(): React.ReactElement {
  const [params, setParams] = useState<TenantListParams>({ page: 1, limit: 25, status: '', tier: '', search: '' });

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: tenantKeys.list(params),
    queryFn:  () => fetchTenantList(params),
  });

  const tenants = data?.data ?? [];
  const total   = data?.total ?? 0;
  const pages   = Math.ceil(total / (params.limit ?? 25));

  const set = (patch: Partial<TenantListParams>) =>
    setParams((p) => ({ ...p, ...patch, page: 1 }));

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={params.search ?? ''}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Search name, slug or email…"
          className="h-9 w-72 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <select
          value={params.status ?? ''}
          onChange={(e) => set({ status: e.target.value as TenantStatus | '' })}
          className="h-9 rounded-lg border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={params.tier ?? ''}
          onChange={(e) => set({ tier: e.target.value as TenantTier | '' })}
          className="h-9 rounded-lg border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {TIER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="ml-auto text-xs text-gray-400">{total} tenant{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Name / Slug', 'Owner email', 'Status', 'Tier', 'Region', 'Created', ''].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">Loading…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-red-500">Failed to load tenants.</td>
              </tr>
            )}
            {!isLoading && tenants.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-gray-400">No tenants found.</td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <Link href={`/tenants/${t.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {t.name}
                    </Link>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">
                      {t.slug}.spancle.com
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{t.email}</td>
                <td className="px-4 py-3">
                  <TenantStatusBadge status={t.status} size="sm" />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                  {TIER_LABELS[t.tier] ?? t.tier}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {(t as any).region ?? '—'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <ActionMenu tenant={t} onRefresh={() => void refetch()} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {params.page} of {pages}</span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={(params.page ?? 1) <= 1}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={(params.page ?? 1) >= pages}
              onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
