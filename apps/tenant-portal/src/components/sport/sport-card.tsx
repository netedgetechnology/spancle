'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  SPORT_STATUS_CONFIG,
  type Sport,
  type SportStatus,
} from '@/types/sport.types';

interface SportCardProps {
  sport:          Sport;
  onStatusChange: (id: string, status: SportStatus) => void;
  onDelete:       (id: string, name: string) => void;
  isUpdating?:    boolean;
}

/**
 * SportCard — card display for a single sport in the list view.
 *
 * Displays:
 *   - Colour swatch + icon + name + slug
 *   - Status badge
 *   - Branch count (or "All branches" when unassigned)
 *   - Config summary (team size, duration, max players)
 *   - Action menu: edit, toggle status, delete
 */
export function SportCard({
  sport,
  onStatusChange,
  onDelete,
  isUpdating = false,
}: SportCardProps): React.ReactElement {
  const router       = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const sc          = SPORT_STATUS_CONFIG[sport.status];
  const isActive    = sport.status === 'active';
  const branchLabel = sport.branchIds.length === 0
    ? 'All branches'
    : `${sport.branchIds.length} branch${sport.branchIds.length !== 1 ? 'es' : ''}`;

  const cfg = sport.config;
  const configPills: { label: string; value: string }[] = [];
  if (cfg.teamSize          != null) configPills.push({ label: 'Team',     value: String(cfg.teamSize) });
  if (cfg.maxPlayers        != null) configPills.push({ label: 'Max',      value: `${cfg.maxPlayers} players` });
  if (cfg.sessionDurationMins != null) configPills.push({ label: 'Duration', value: `${cfg.sessionDurationMins}min` });

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-white shadow-sm transition-shadow hover:shadow-md overflow-hidden',
        isActive ? 'border-gray-200' : 'border-gray-100 opacity-70',
      )}
    >
      {/* Colour stripe */}
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: sport.color ?? '#e5e7eb' }}
        aria-hidden="true"
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {/* Colour + icon swatch */}
            <div
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-xl shadow-sm"
              style={{ backgroundColor: (sport.color ?? '#3b82f6') + '22' }}
              aria-hidden="true"
            >
              {sport.icon ?? '🏅'}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-semibold text-gray-900 truncate">{sport.name}</h3>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                    sc.bg, sc.text, sc.ring,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', sc.dot)} aria-hidden="true" />
                  {sc.label}
                </span>
              </div>
              <p className="text-xs font-mono text-gray-400 mt-0.5">{sport.slug}</p>
            </div>
          </div>

          {/* Action menu */}
          <div className="relative flex-shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              disabled={isUpdating}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none disabled:opacity-40"
              aria-label={`${sport.name} actions`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); router.push(`/sports/${sport.id}/edit`); }}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Edit sport
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onStatusChange(sport.id, isActive ? 'inactive' : 'active');
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Set {isActive ? 'inactive' : 'active'}
                  </button>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete(sport.id, sport.name);
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

        {/* Description */}
        {sport.description && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed line-clamp-2">
            {sport.description}
          </p>
        )}

        {/* Branch + config pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {/* Branch count */}
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            sport.branchIds.length === 0
              ? 'bg-blue-50 text-blue-700'
              : 'bg-gray-100 text-gray-600',
          )}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
            {branchLabel}
          </span>

          {/* Config pills */}
          {configPills.map((p) => (
            <span
              key={p.label}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600"
            >
              {p.label}: {p.value}
            </span>
          ))}
        </div>

        {/* Age groups */}
        {Array.isArray(cfg.ageGroups) && (cfg.ageGroups as string[]).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(cfg.ageGroups as string[]).slice(0, 4).map((ag) => (
              <span
                key={ag}
                className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 capitalize"
              >
                {ag}
              </span>
            ))}
            {(cfg.ageGroups as string[]).length > 4 && (
              <span className="text-[11px] text-gray-400">
                +{(cfg.ageGroups as string[]).length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Edit button */}
        <button
          type="button"
          onClick={() => router.push(`/sports/${sport.id}/edit`)}
          className="mt-4 w-full rounded-lg border border-gray-200 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors focus:outline-none"
        >
          Edit sport
        </button>
      </div>
    </div>
  );
}
