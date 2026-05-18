'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { TenantStatusBadge } from './tenant-status-badge';
import { useToast } from '@/components/ui/toast';
import {
  fetchTenantList, activateTenant, suspendTenant, terminateTenant,
  tenantKeys,
} from '@/lib/tenants.api';
import type { TenantDetail } from '@/types/tenant-detail.types';
import { TIER_LABELS } from '@/types/tenant-detail.types';
import type { TenantStatus, TenantTier } from '@/types/admin.types';
import { cn } from '@/lib/utils/cn';

// ── Status tabs ───────────────────────────────────────────────────────────────

const STATUS_TABS: { value: TenantStatus | 'active_only' | ''; label: string }[] = [
  { value: 'active_only', label: 'Active'      },
  { value: '',            label: 'All'          },
  { value: 'terminated',  label: 'Terminated'   },
];

const TIER_OPTIONS: { value: TenantTier | ''; label: string }[] = [
  { value: '',           label: 'All tiers'  },
  { value: 'free',       label: 'Free'       },
  { value: 'starter',    label: 'Starter'    },
  { value: 'growth',     label: 'Growth'     },
  { value: 'pro',        label: 'Pro'        },
  { value: 'enterprise', label: 'Enterprise' },
];

// ── Terminate confirm modal ───────────────────────────────────────────────────

function TerminateModal({
  tenant,
  onConfirm,
  onCancel,
  isPending,
}: {
  tenant:    TenantDetail;
  onConfirm: (reason: string) => void;
  onCancel:  () => void;
  isPending: boolean;
}): React.ReactElement {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start gap-4 p-6 border-b border-gray-100">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Terminate tenant?</h3>
            <p className="mt-1 text-sm text-gray-500">
              Terminating <strong>{tenant.name}</strong> ({tenant.slug}.spancle.com) will disable
              tenant access. This does not permanently delete data — terminated tenants are retained
              for audit and can be reviewed under the Terminated filter.
            </p>
          </div>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Non-payment, breach of terms, account closure request…"
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-400"
            />
            <p className="mt-1 text-xs text-gray-400">This reason is logged and attached to the tenant record.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!reason.trim() || isPending}
              onClick={() => onConfirm(reason.trim())}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {isPending && (
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isPending ? 'Terminating…' : 'Terminate tenant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Suspend confirm modal ─────────────────────────────────────────────────────

function SuspendModal({
  tenant, onConfirm, onCancel, isPending,
}: {
  tenant: TenantDetail; onConfirm: (reason: string) => void;
  onCancel: () => void; isPending: boolean;
}): React.ReactElement {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Suspend tenant?</h3>
          <p className="mt-1 text-sm text-gray-500">
            Suspending <strong>{tenant.name}</strong> will temporarily disable tenant access. You can reactivate it later.
          </p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Payment overdue, investigation pending…" rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onCancel} disabled={isPending}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              Cancel
            </button>
            <button type="button" disabled={!reason.trim() || isPending}
              onClick={() => onConfirm(reason.trim())}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
              {isPending ? 'Suspending…' : 'Suspend tenant'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Row action menu ───────────────────────────────────────────────────────────

function ActionMenu({ tenant, onRefresh }: {
  tenant: TenantDetail; onRefresh: () => void;
}): React.ReactElement {
  const [open,    setOpen]    = useState(false);
  const [confirm, setConfirm] = useState<'suspend' | 'terminate' | null>(null);
  const { addToast } = useToast();
  const qc = useQueryClient();

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: tenantKeys.all() });
    onRefresh();
  };

  const activate  = useMutation({
    mutationFn: () => activateTenant(tenant.id),
    onSuccess:  () => { invalidate(); addToast(`${tenant.name} activated successfully.`); setOpen(false); },
    onError:    () => { addToast('Failed to activate tenant. Try again.', 'error'); },
  });

  const suspend  = useMutation({
    mutationFn: (reason: string) => suspendTenant(tenant.id, reason),
    onSuccess:  () => { invalidate(); addToast(`${tenant.name} suspended.`, 'info'); setConfirm(null); setOpen(false); },
    onError:    (e: any) => { addToast(e?.response?.data?.message ?? 'Failed to suspend tenant.', 'error'); },
  });

  const terminate = useMutation({
    mutationFn: (reason: string) => terminateTenant(tenant.id, reason),
    onSuccess:  () => { invalidate(); addToast(`${tenant.name} terminated successfully.`, 'info'); setConfirm(null); setOpen(false); },
    onError:    (e: any) => { addToast(e?.response?.data?.message ?? 'Failed to terminate tenant.', 'error'); },
  });

  return (
    <>
      <div className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Tenant actions">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
          </svg>
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              <Link href={`/tenants/${tenant.id}`} onClick={() => setOpen(false)}
                className="flex items-center px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
                View / Edit
              </Link>

              {tenant.status !== 'active' && tenant.status !== 'terminated' && (
                <button type="button" onClick={() => { activate.mutate(); }}
                  disabled={activate.isPending}
                  className="flex w-full items-center px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                  {activate.isPending ? 'Activating…' : 'Activate'}
                </button>
              )}
              {tenant.status === 'active' && (
                <button type="button" onClick={() => { setOpen(false); setConfirm('suspend'); }}
                  className="flex w-full items-center px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-50">
                  Suspend
                </button>
              )}
              {tenant.status !== 'terminated' && (
                <button type="button" onClick={() => { setOpen(false); setConfirm('terminate'); }}
                  className="flex w-full items-center px-3 py-1.5 text-sm text-red-700 hover:bg-red-50">
                  Terminate
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {confirm === 'terminate' && (
        <TerminateModal
          tenant={tenant}
          isPending={terminate.isPending}
          onConfirm={(r) => terminate.mutate(r)}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'suspend' && (
        <SuspendModal
          tenant={tenant}
          isPending={suspend.isPending}
          onConfirm={(r) => suspend.mutate(r)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

interface TenantTableProps {
  initialSuccessMessage?: string;
}

export function TenantTable({ initialSuccessMessage }: TenantTableProps): React.ReactElement {
  // Default: show active-only (excludes terminated)
  const [tab,    setTab]    = useState<'active_only' | '' | TenantStatus>('active_only');
  const [tier,   setTier]   = useState<TenantTier | ''>('');
  const [search, setSearch] = useState('');
  const [page,   setPage]   = useState(1);
  const { addToast } = useToast();

  // Show initial success message passed via query param
  const [shownInit, setShownInit] = useState(false);
  if (initialSuccessMessage && !shownInit) {
    setShownInit(true);
    // Delay to allow component mount
    setTimeout(() => addToast(initialSuccessMessage, 'success'), 100);
  }

  // Map tab → API status param
  // 'active_only' → filter out terminated on client side since API doesn't have a "not-terminated" filter
  const apiStatus: TenantStatus | '' =
    tab === 'active_only' ? '' :
    tab === 'terminated'  ? 'terminated' :
    '' ;

  const params = {
    page, limit: 25,
    status: apiStatus,
    tier:   tier || undefined,
    search: search || undefined,
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: tenantKeys.list(params),
    queryFn:  () => fetchTenantList(params),
  });

  // Client-side filter for active_only tab
  const allTenants  = data?.data ?? [];
  const tenants     = tab === 'active_only'
    ? allTenants.filter((t) => t.status !== 'terminated')
    : allTenants;
  const total       = tab === 'active_only' ? tenants.length : (data?.total ?? 0);
  const pages       = Math.ceil((data?.total ?? 0) / 25);

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {STATUS_TABS.map((t) => (
          <button key={t.value} type="button"
            onClick={() => { setTab(t.value as typeof tab); setPage(1); }}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === t.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + tier filter */}
      <div className="flex flex-wrap items-center gap-3">
        <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search name, slug or email…"
          className="h-9 w-72 rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <select value={tier} onChange={(e) => { setTier(e.target.value as typeof tier); setPage(1); }}
          className="h-9 rounded-lg border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
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
                <th key={h} scope="col"
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading && (
              <tr><td colSpan={7} className="py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Loading…
                </div>
              </td></tr>
            )}
            {error && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-red-500">
                Failed to load tenants. Check your connection or session.
              </td></tr>
            )}
            {!isLoading && !error && tenants.length === 0 && (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">
                {tab === 'active_only' ? 'No active tenants.' : 'No tenants found.'}
              </td></tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id} className={cn('hover:bg-gray-50 transition-colors', t.status === 'terminated' && 'opacity-60')}>
                <td className="px-4 py-3">
                  <div>
                    <Link href={`/tenants/${t.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                      {t.name}
                    </Link>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">
                      {t.slug}.spancle.com
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{t.email}</td>
                <td className="px-4 py-3"><TenantStatusBadge status={t.status} size="sm" /></td>
                <td className="px-4 py-3 text-sm text-gray-600">{TIER_LABELS[t.tier] ?? t.tier}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{(t as any).region ?? '—'}</td>
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
      {pages > 1 && tab !== 'active_only' && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {pages}</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">
              Previous
            </button>
            <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-gray-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
