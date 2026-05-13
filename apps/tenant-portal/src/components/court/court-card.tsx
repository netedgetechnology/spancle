'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  COURT_STATUS_CONFIG,
  SURFACE_LABELS,
  COURT_TYPE_LABELS,
  courtTypeIcon,
  formatRate,
  type Court,
  type CourtStatus,
} from '@/types/court.types';

interface CourtCardProps {
  court:          Court;
  onStatusChange: (id: string, status: CourtStatus) => void;
  onMaintenance:  (court: Court) => void;
  onDelete:       (id: string, name: string) => void;
  isUpdating?:    boolean;
}

const STATUS_ACTIONS: Record<CourtStatus, Array<{ label: string; to: CourtStatus }>> = {
  available:   [{ label: 'Set unavailable', to: 'unavailable' }, { label: 'Retire', to: 'retired' }],
  unavailable: [{ label: 'Set available',   to: 'available'   }, { label: 'Retire', to: 'retired' }],
  maintenance: [{ label: 'Mark available',  to: 'available'   }, { label: 'Mark unavailable', to: 'unavailable' }, { label: 'Retire', to: 'retired' }],
  retired:     [],
};

/**
 * CourtCard — displays a single court in the list grid.
 *
 * Shows:
 *   - Name + code + court/surface type badges
 *   - Indoor/outdoor icon + label
 *   - Status badge (with maintenance note alert)
 *   - Capacity + hourly rate
 *   - Operating hours indicator
 *   - Action menu: edit, status changes, maintenance, delete
 */
export function CourtCard({
  court,
  onStatusChange,
  onMaintenance,
  onDelete,
  isUpdating = false,
}: CourtCardProps): React.ReactElement {
  const router     = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const sc          = COURT_STATUS_CONFIG[court.status];
  const isMaintenance = court.status === 'maintenance';
  const actions     = STATUS_ACTIONS[court.status] ?? [];

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden flex flex-col',
        court.status === 'available'   && 'border-gray-200',
        court.status === 'unavailable' && 'border-amber-100',
        court.status === 'maintenance' && 'border-red-200',
        court.status === 'retired'     && 'border-gray-100 opacity-60',
      )}
    >
      {/* Status stripe */}
      <div className={cn('h-1 w-full', sc.dot)} aria-hidden="true" />

      {/* Maintenance banner */}
      {isMaintenance && court.maintenanceNote && (
        <div className="flex items-start gap-2 bg-red-50 border-b border-red-100 px-4 py-2">
          <svg className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
          <p className="text-xs text-red-700 leading-relaxed line-clamp-2">{court.maintenanceNote}</p>
        </div>
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg" aria-hidden="true">{courtTypeIcon(court.courtType)}</span>
              <h3 className="text-base font-semibold text-gray-900 truncate">{court.name}</h3>
              {court.code && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-600">
                  {court.code}
                </span>
              )}
            </div>
          </div>

          {/* Action menu */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={isUpdating}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none disabled:opacity-40"
              aria-label={`${court.name} actions`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); router.push(`/courts/${court.id}/edit`); }}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit court
                  </button>
                  {court.status !== 'maintenance' && court.status !== 'retired' && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onMaintenance(court); }}
                      className="flex w-full items-center px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                    >
                      Set maintenance
                    </button>
                  )}
                  {actions.map((a) => (
                    <button
                      key={a.to}
                      type="button"
                      onClick={() => { setMenuOpen(false); onStatusChange(court.id, a.to); }}
                      className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {a.label}
                    </button>
                  ))}
                  {court.status !== 'available' && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onDelete(court.id, court.name); }}
                      className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete court
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tags row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* Status badge */}
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
            sc.bg, sc.text, sc.ring,
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', sc.dot)} aria-hidden="true" />
            {sc.label}
          </span>

          {/* Indoor/outdoor */}
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
            court.courtType === 'indoor'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-green-50 text-green-700',
          )}>
            {COURT_TYPE_LABELS[court.courtType]}
          </span>

          {/* Surface */}
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
            {SURFACE_LABELS[court.surfaceType]}
          </span>
        </div>

        {/* Stats row */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500 flex-1">
          {court.capacity != null && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              {court.capacity} capacity
            </span>
          )}

          {court.dimensions && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
              {court.dimensions}
            </span>
          )}

          {court.operatingHours && (
            <span className="flex items-center gap-1 text-primary-600 font-medium">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Custom hours
            </span>
          )}

          {court.hourlyRateMinor != null && (
            <span className="font-medium text-gray-700">
              {formatRate(court.hourlyRateMinor)}
            </span>
          )}
        </div>

        {/* Maintenance expected end */}
        {isMaintenance && court.maintenanceExpectedEnd && (
          <p className="mt-3 text-xs text-red-500">
            Expected back: {new Date(court.maintenanceExpectedEnd).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </p>
        )}

        {/* Edit button */}
        <button
          type="button"
          onClick={() => router.push(`/courts/${court.id}/edit`)}
          className="mt-4 w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none"
        >
          Edit court
        </button>
      </div>
    </div>
  );
}
