'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }                  from '@/lib/utils/cn';
import { CourtCard }           from '@/components/court/court-card';
import { CourtGenerateModal }  from '@/components/court/court-generate-modal';
import { PageLoader }          from '@/components/ui/page-loader';
import { ErrorDisplay }        from '@/components/ui/error-display';
import {
  fetchCourts, fetchCourtStatusSummary,
  updateCourtStatus, setCourtMaintenance,
  deleteCourt, generateCourts, courtKeys,
} from '@/lib/court.api';
import type { Court, CourtStatus } from '@/types/court.types';
import { COURT_STATUS_CONFIG } from '@/types/court.types';

const FILTER_TABS: { label: string; value: CourtStatus | 'all' }[] = [
  { label: 'All',         value: 'all'         },
  { label: 'Available',   value: 'available'   },
  { label: 'Unavailable', value: 'unavailable' },
  { label: 'Maintenance', value: 'maintenance' },
  { label: 'Retired',     value: 'retired'     },
];

interface MaintenanceModalState {
  court: Court;
  note:  string;
  expectedEnd: string;
}

/**
 * Courts list page — /dashboard/courts
 *
 * Features:
 *   - Status filter tabs with live counts
 *   - Quick status changes + maintenance via card action menus
 *   - Generate courts modal (bulk creation)
 *   - Inline maintenance note modal
 */
export default function CourtsListPage(): React.ReactElement {
  const router      = useRouter();
  const queryClient = useQueryClient();

  const [activeTab,     setActiveTab]     = useState<CourtStatus | 'all'>('all');
  const [showGenerate,  setShowGenerate]  = useState(false);
  const [maintenanceModal, setMaintenanceModal] = useState<MaintenanceModalState | null>(null);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: courtKeys.all() });
  };

  const { data: summary = { available: 0, unavailable: 0, maintenance: 0, retired: 0 } } = useQuery({
    queryKey: courtKeys.summary(),
    queryFn:  fetchCourtStatusSummary,
  });

  const { data: courts = [], isLoading, error, refetch } = useQuery({
    queryKey: courtKeys.list(activeTab === 'all' ? {} : { status: activeTab }),
    queryFn:  () => fetchCourts(activeTab === 'all' ? undefined : { status: activeTab }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: CourtStatus }) =>
      updateCourtStatus(id, status),
    onSuccess: invalidate,
  });

  const maintenanceMut = useMutation({
    mutationFn: ({ id, note, end }: { id: string; note: string; end?: string }) =>
      setCourtMaintenance(id, note, end),
    onSuccess: () => { invalidate(); setMaintenanceModal(null); },
  });

  const deleteMut = useMutation({
    mutationFn: deleteCourt,
    onSuccess:  invalidate,
  });

  const generateMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => generateCourts(payload),
    onSuccess: (result) => {
      invalidate();
      setShowGenerate(false);
      // Show result summary
      if (result.skipped > 0) {
        alert(`Generated ${result.created} courts. ${result.skipped} name${result.skipped !== 1 ? 's' : ''} skipped (already exist).`);
      }
    },
  });

  const handleDelete = (id: string, name: string): void => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteMut.mutate(id);
  };

  const isBusy = statusMut.isPending || maintenanceMut.isPending || deleteMut.isPending;
  const total  = Object.values(summary).reduce((a, b) => a + b, 0);
  const maintenanceCount = summary.maintenance;

  return (
    <div className="flex flex-col gap-6">

      {/* Generate modal */}
      {showGenerate && (
        <CourtGenerateModal
          onGenerate={(payload) => { void generateMut.mutateAsync(payload); }}
          onClose={() => setShowGenerate(false)}
          isLoading={generateMut.isPending}
        />
      )}

      {/* Maintenance modal */}
      {maintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Set maintenance</h3>
              <p className="text-sm text-gray-500 mt-1">
                Court: <span className="font-medium">{maintenanceModal.court.name}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Maintenance reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Describe the maintenance work required…"
                value={maintenanceModal.note}
                onChange={(e) => setMaintenanceModal((m) => m ? { ...m, note: e.target.value } : null)}
                className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Expected completion date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                value={maintenanceModal.expectedEnd}
                onChange={(e) => setMaintenanceModal((m) => m ? { ...m, expectedEnd: e.target.value } : null)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setMaintenanceModal(null)} disabled={maintenanceMut.isPending}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={!maintenanceModal.note.trim() || maintenanceMut.isPending}
                onClick={() => maintenanceMut.mutate({
                  id:   maintenanceModal.court.id,
                  note: maintenanceModal.note,
                  end:  maintenanceModal.expectedEnd || undefined,
                })}
                className="px-4 py-2 rounded-lg bg-amber-600 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {maintenanceMut.isPending ? 'Setting…' : 'Set maintenance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Courts</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {total} court{total !== 1 ? 's' : ''}
            {maintenanceCount > 0 && (
              <span className="ml-2 text-red-500 font-medium">
                · {maintenanceCount} in maintenance
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGenerate(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 2.25h-1.5a2.251 2.251 0 00-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 00-9-9z" />
            </svg>
            Generate courts
          </button>
          <button
            type="button"
            onClick={() => router.push('/courts/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New court
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 flex-wrap">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === 'all'
            ? total
            : (summary[tab.value as CourtStatus] ?? 0);
          const cfg   = tab.value !== 'all' ? COURT_STATUS_CONFIG[tab.value as CourtStatus] : null;

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
              {cfg && (
                <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} aria-hidden="true" />
              )}
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
        <PageLoader message="Loading courts…" />
      ) : error ? (
        <ErrorDisplay
          title="Failed to load courts"
          message={(error as Error).message}
          retry={() => void refetch()}
        />
      ) : courts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <div className="rounded-full bg-gray-100 p-4 mb-4">
            <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-600">
            {activeTab === 'all' ? 'No courts yet' : `No ${activeTab} courts`}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === 'all' ? 'Create a court or use Generate to bulk-create numbered courts' : 'Try a different filter'}
          </p>
          {activeTab === 'all' && (
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => setShowGenerate(true)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Generate courts
              </button>
              <button type="button" onClick={() => router.push('/courts/new')}
                className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
                Add first court
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {courts.map((court) => (
            <CourtCard
              key={court.id}
              court={court}
              onStatusChange={(id, status) => statusMut.mutate({ id, status })}
              onMaintenance={(c) => setMaintenanceModal({ court: c, note: '', expectedEnd: '' })}
              onDelete={handleDelete}
              isUpdating={isBusy}
            />
          ))}
        </div>
      )}
    </div>
  );
}
