'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }           from '@/lib/utils/cn';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchCourt, updateCourtStatus, setCourtMaintenance,
  deleteCourt, courtKeys,
} from '@/lib/court.api';
import {
  COURT_STATUS_CONFIG, SURFACE_LABELS, COURT_TYPE_LABELS,
  courtTypeIcon, formatRate, type CourtStatus,
} from '@/types/court.types';
import { DAY_KEYS, DAY_LABELS } from '@/types/branch.types';

export default function CourtDetailPage(): React.ReactElement {
  const { id }      = useParams<{ id: string }>();
  const router      = useRouter();
  const queryClient = useQueryClient();
  const [maintenanceNote, setMaintenanceNote] = useState('');
  const [maintenanceEnd,  setMaintenanceEnd]  = useState('');
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);

  const { data: court, isLoading, error, refetch } = useQuery({
    queryKey: courtKeys.detail(id),
    queryFn:  () => fetchCourt(id),
    enabled:  !!id,
  });

  const statusMut = useMutation({
    mutationFn: (status: CourtStatus) => updateCourtStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(courtKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: courtKeys.list() });
      void queryClient.invalidateQueries({ queryKey: courtKeys.summary() });
    },
  });

  const maintenanceMut = useMutation({
    mutationFn: () => setCourtMaintenance(id, maintenanceNote, maintenanceEnd || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(courtKeys.detail(id), updated);
      void queryClient.invalidateQueries({ queryKey: courtKeys.list() });
      setShowMaintenanceForm(false);
      setMaintenanceNote('');
      setMaintenanceEnd('');
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteCourt(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: courtKeys.all() });
      router.push('/courts');
    },
  });

  if (isLoading) return <PageLoader message="Loading court…" />;
  if (error || !court) {
    return <ErrorDisplay title="Court not found" message={(error as Error | undefined)?.message} retry={() => void refetch()} />;
  }

  const sc = COURT_STATUS_CONFIG[court.status];
  const isMaintenance = court.status === 'maintenance';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <button type="button" onClick={() => router.push('/courts')}
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-3 focus:outline-none">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to courts
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">{courtTypeIcon(court.courtType)}</span>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-gray-900">{court.name}</h2>
                {court.code && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600">{court.code}</span>
                )}
                <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', sc.bg, sc.text, sc.ring)}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} aria-hidden="true" />
                  {sc?.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{COURT_TYPE_LABELS[court.courtType]} · {SURFACE_LABELS[court.surfaceType]}</p>
            </div>
          </div>
          <button type="button" onClick={() => router.push(`/courts/${id}/edit`)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Edit court
          </button>
        </div>
      </div>

      {/* Maintenance banner */}
      {isMaintenance && court.maintenanceNote && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-4">
          <svg className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-800">Under maintenance</p>
            <p className="text-sm text-red-700 mt-0.5">{court.maintenanceNote}</p>
            {court.maintenanceExpectedEnd && (
              <p className="text-xs text-red-500 mt-1">
                Expected completion: {new Date(court.maintenanceExpectedEnd).toLocaleDateString(undefined, { dateStyle: 'long' })}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Attributes */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Attributes</p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: 'Type',        value: COURT_TYPE_LABELS[court.courtType] },
                { label: 'Surface',     value: SURFACE_LABELS[court.surfaceType]  },
                court.capacity         != null && { label: 'Capacity',   value: `${court.capacity} players` },
                court.dimensions              && { label: 'Dimensions',  value: court.dimensions             },
                { label: 'Concurrent bookings', value: String(court.maxBookingsConcurrent) },
                court.hourlyRateMinor  != null && { label: 'Rate',       value: formatRate(court.hourlyRateMinor) },
              ].filter((x): x is { label: string; value: string } => Boolean(x)).map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="font-medium text-gray-900 mt-0.5">{value}</dd>
                </div>
              ))}
            </dl>
            {court.description && (
              <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">{court.description}</p>
            )}
          </div>

          {/* Operating hours */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Operating hours
              {!court.operatingHours && (
                <span className="ml-2 text-[10px] font-normal text-gray-400">(inheriting branch hours)</span>
              )}
            </p>
            {court.operatingHours ? (
              <dl className="space-y-1.5">
                {DAY_KEYS.map((day) => {
                  const t = court.operatingHours![day];
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
            ) : (
              <p className="text-sm text-gray-400">No custom hours set — branch schedule applies</p>
            )}
          </div>

          {/* Amenities */}
          {court.amenities && court.amenities.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {court.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-blue-50 border border-blue-100 px-3 py-1 text-xs font-medium text-blue-700 capitalize">
                    {a.replace(/_/g, ' ')}
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
              {(['available', 'unavailable', 'maintenance', 'retired'] as CourtStatus[]).map((s) => {
                const isCurrent = court.status === s;
                const cfg2      = COURT_STATUS_CONFIG[s];
                const isRetired = court.status === 'retired';

                return (
                  <button key={s} type="button"
                    disabled={isCurrent || isRetired || statusMut.isPending || s === 'maintenance'}
                    onClick={() => statusMut.mutate(s)}
                    title={s === 'maintenance' ? 'Use "Set maintenance" button below' : undefined}
                    className={cn(
                      'flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
                      isCurrent ? cn('border-2', cfg2.bg, cfg2.text, cfg2.ring)
                        : s === 'maintenance'
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed',
                    )}>
                    <span className="flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', cfg2.dot)} aria-hidden="true" />
                      {cfg2?.label}
                    </span>
                    {isCurrent && <span className="text-xs font-semibold">Current</span>}
                    {s === 'maintenance' && !isCurrent && <span className="text-[10px]">See below</span>}
                  </button>
                );
              })}
            </div>

            {/* Maintenance button */}
            {court.status !== 'retired' && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                {showMaintenanceForm ? (
                  <div className="flex flex-col gap-2">
                    <textarea rows={2} value={maintenanceNote} onChange={(e) => setMaintenanceNote(e.target.value)}
                      placeholder="Maintenance reason…"
                      className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none" />
                    <input type="date" value={maintenanceEnd} onChange={(e) => setMaintenanceEnd(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-amber-400 focus:outline-none" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setShowMaintenanceForm(false)}
                        className="flex-1 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
                        Cancel
                      </button>
                      <button type="button"
                        disabled={!maintenanceNote.trim() || maintenanceMut.isPending}
                        onClick={() => maintenanceMut.mutate()}
                        className="flex-1 py-1.5 rounded-lg bg-amber-600 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50">
                        {maintenanceMut.isPending ? 'Setting…' : 'Confirm'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowMaintenanceForm(true)}
                    className="w-full rounded-lg border border-amber-200 bg-amber-50 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
                    Set maintenance
                  </button>
                )}
              </div>
            )}

            {/* Delete */}
            {court.status !== 'available' && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button type="button" disabled={deleteMut.isPending}
                  onClick={() => { if (confirm(`Delete "${court.name}"?`)) deleteMut.mutate(); }}
                  className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50">
                  {deleteMut.isPending ? 'Deleting…' : 'Delete court'}
                </button>
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Info</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between"><dt className="text-gray-400">Created</dt><dd className="text-gray-700">{new Date(court.createdAt).toLocaleDateString()}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-400">Updated</dt><dd className="text-gray-700">{new Date(court.updatedAt).toLocaleDateString()}</dd></div>
              {court.courtNumber != null && (
                <div className="flex justify-between"><dt className="text-gray-400">Court #</dt><dd className="text-gray-700">{court.courtNumber}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-gray-400">ID</dt><dd className="font-mono text-[10px] text-gray-500">{id.slice(0, 8)}…</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
