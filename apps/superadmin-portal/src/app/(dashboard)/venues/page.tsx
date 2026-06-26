'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTenantList } from '@/lib/tenants.api';
import { fetchVenuesForTenant, fetchCourtsForTenant, fetchSportsForTenant } from '@/lib/venues.api';
import { cn } from '@/lib/utils/cn';

type Tab = 'branches' | 'courts' | 'sports';

function TenantPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect:   (id: string, name: string) => void;
}): React.ReactElement {
  const { data } = useQuery({
    queryKey: ['tenants-for-venues'],
    queryFn:  () => fetchTenantList({ limit: 100, status: 'active' }),
  });
  const tenants = data?.data ?? [];

  return (
    <select
      value={selectedId}
      onChange={(e) => {
        const t = tenants.find((x) => x.id === e.target.value);
        if (t) onSelect(t.id, t.name);
      }}
      className="h-9 rounded-lg border border-gray-300 px-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
    >
      <option value="">Select a tenant…</option>
      {tenants.map((t) => (
        <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
      ))}
    </select>
  );
}

export default function VenuesOverviewPage(): React.ReactElement {
  const [tenantId,   setTenantId]   = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tab,        setTab]        = useState<Tab>('branches');

  const { data: venues  = [], isLoading: loadV } = useQuery({
    queryKey: ['venues', tenantId],
    queryFn:  () => fetchVenuesForTenant(tenantId),
    enabled:  !!tenantId && tab === 'branches',
  });
  const { data: courts  = [], isLoading: loadC } = useQuery({
    queryKey: ['courts', tenantId],
    queryFn:  () => fetchCourtsForTenant(tenantId),
    enabled:  !!tenantId && tab === 'courts',
  });
  const { data: sports  = [], isLoading: loadS } = useQuery({
    queryKey: ['sports', tenantId],
    queryFn:  () => fetchSportsForTenant(tenantId),
    enabled:  !!tenantId && tab === 'sports',
  });

  const isLoading = loadV || loadC || loadS;

  const TABS: { value: Tab; label: string }[] = [
    { value: 'branches', label: 'Branches (Venues)' },
    { value: 'courts',   label: 'Courts'             },
    { value: 'sports',   label: 'Sports'             },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Venue Management</h2>
          <p className="mt-0.5 text-xs text-gray-400">Read-only cross-tenant view of branches, courts and sports</p>
        </div>
        <TenantPicker selectedId={tenantId} onSelect={(id, name) => { setTenantId(id); setTenantName(name); }} />
      </div>

      {!tenantId ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <p className="text-sm font-medium text-gray-600">Select a tenant above to view their venue data</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1 border-b border-gray-200">
            {TABS.map((t) => (
              <button key={t.value} type="button" onClick={() => setTab(t.value)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  tab === t.value
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {isLoading && (
              <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
            )}

            {!isLoading && tab === 'branches' && (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Slug', 'Status', 'City', 'Country', 'Created'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {venues.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">No branches for {tenantName}</td></tr>}
                  {venues.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{v.name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{v.slug}</td>
                      <td className="px-4 py-3"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', v.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-gray-200')}>{v.status}</span></td>
                      <td className="px-4 py-3 text-sm text-gray-500">{v.city ?? '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{v.country ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(v.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isLoading && tab === 'courts' && (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Name', 'Type', 'Surface', 'Status', 'Sport'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courts.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No courts for {tenantName}</td></tr>}
                  {courts.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">{c.courtType}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">{c.surfaceType.replace('_', ' ')}</td>
                      <td className="px-4 py-3"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', c.status === 'available' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : c.status === 'maintenance' ? 'bg-red-50 text-red-700 ring-red-200' : 'bg-gray-100 text-gray-600 ring-gray-200')}>{c.status}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{c.sportId ? c.sportId.slice(0, 8) + '…' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!isLoading && tab === 'sports' && (
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Icon', 'Name', 'Slug', 'Status', 'Color'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sports.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-sm text-gray-400">No sports for {tenantName}</td></tr>}
                  {sports.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-lg">{s.icon ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.slug}</td>
                      <td className="px-4 py-3"><span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', s.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-100 text-gray-600 ring-gray-200')}>{s.status}</span></td>
                      <td className="px-4 py-3">
                        {s.color ? (
                          <div className="flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full border border-gray-200" style={{ backgroundColor: s.color }} />
                            <span className="text-xs font-mono text-gray-500">{s.color}</span>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
