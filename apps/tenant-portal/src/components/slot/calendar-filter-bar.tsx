'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchBranches, branchKeys } from '@/lib/branch.api';
import { fetchCourts,  courtKeys  } from '@/lib/court.api';
import { fetchSports,  sportKeys  } from '@/lib/sport.api';
import {
  addDays,
  formatDisplayDate,
  todayString,
  SLOT_STATUS_CONFIG,
  type CalendarFilters,
  type SlotStatus,
} from '@/types/slot.types';

interface CalendarFilterBarProps {
  filters:   CalendarFilters;
  onChange:  (patch: Partial<CalendarFilters>) => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS: SlotStatus[] = [
  'available', 'reserved', 'booked', 'cancelled', 'completed', 'unavailable',
];

/**
 * CalendarFilterBar — date navigation + filter dropdowns.
 *
 * Layout:
 *   [ ← ] [ Date label ] [ → ] [ Today ]    ← date nav
 *   [ Branch ▾ ] [ Court ▾ ] [ Sport ▾ ] [ Status ▾ ]  ← filters
 *
 * Court dropdown is gated by branch selection — only shows courts in
 * the selected branch.
 *
 * On mobile: date nav row + filters stack vertically.
 */
export function CalendarFilterBar({
  filters,
  onChange,
  isLoading = false,
}: CalendarFilterBarProps): React.ReactElement {
  const isToday = filters.date === todayString();

  const { data: branches = [] } = useQuery({
    queryKey: branchKeys.list(),
    queryFn:  () => fetchBranches(),
    staleTime: 60_000,
  });

  const { data: courts = [] } = useQuery({
    queryKey: courtKeys.list(filters.branchId ? { branchId: filters.branchId } : {}),
    queryFn:  () => fetchCourts(filters.branchId ? { branchId: filters.branchId } : undefined),
    staleTime: 60_000,
  });

  const { data: sports = [] } = useQuery({
    queryKey: sportKeys.list(),
    queryFn:  () => fetchSports(),
    staleTime: 60_000,
  });

  const eligibleBranches = branches.filter((b) => b.status !== 'archived');
  const eligibleCourts   = courts.filter((c) => c.status !== 'retired');
  const eligibleSports   = sports.filter((s) => s.status === 'active');

  const sel = 'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200';

  return (
    <div className="flex flex-col gap-3">

      {/* Date navigation */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => onChange({ date: addDays(filters.date, -1) })}
            className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors border-r border-gray-200 focus:outline-none"
            aria-label="Previous day"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              const input = document.getElementById('cal-date-input') as HTMLInputElement;
              input?.showPicker?.();
            }}
            className="relative flex items-center gap-2 px-4 h-9 text-sm font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none min-w-[180px] justify-center"
          >
            <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {formatDisplayDate(filters.date)}
            <input
              id="cal-date-input"
              type="date"
              value={filters.date}
              onChange={(e) => e.target.value && onChange({ date: e.target.value })}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              aria-label="Select date"
            />
          </button>

          <button
            type="button"
            onClick={() => onChange({ date: addDays(filters.date, 1) })}
            className="flex h-9 w-9 items-center justify-center text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition-colors border-l border-gray-200 focus:outline-none"
            aria-label="Next day"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {!isToday && (
          <button
            type="button"
            onClick={() => onChange({ date: todayString() })}
            className="rounded-lg border border-gray-300 bg-white px-3 h-9 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none shadow-sm"
          >
            Today
          </button>
        )}

        {isLoading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-300 border-t-primary-600" aria-label="Loading" />
        )}
      </div>

      {/* Filter dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

        {/* Branch */}
        <div>
          <label htmlFor="cal-branch" className="sr-only">Filter by branch</label>
          <select
            id="cal-branch"
            value={filters.branchId ?? ''}
            onChange={(e) => onChange({
              branchId: e.target.value || null,
              courtId:  null, // reset court when branch changes
            })}
            className={sel}
          >
            <option value="">All branches</option>
            {eligibleBranches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Court */}
        <div>
          <label htmlFor="cal-court" className="sr-only">Filter by court</label>
          <select
            id="cal-court"
            value={filters.courtId ?? ''}
            onChange={(e) => onChange({ courtId: e.target.value || null })}
            className={sel}
            disabled={eligibleCourts.length === 0}
          >
            <option value="">All courts</option>
            {eligibleCourts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Sport */}
        <div>
          <label htmlFor="cal-sport" className="sr-only">Filter by sport</label>
          <select
            id="cal-sport"
            value={filters.sportId ?? ''}
            onChange={(e) => onChange({ sportId: e.target.value || null })}
            className={sel}
          >
            <option value="">All sports</option>
            {eligibleSports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon ? `${s.icon} ` : ''}{s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="cal-status" className="sr-only">Filter by status</label>
          <select
            id="cal-status"
            value={filters.status ?? ''}
            onChange={(e) => onChange({ status: (e.target.value as SlotStatus) || null })}
            className={sel}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{SLOT_STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter pills */}
      {(filters.branchId || filters.courtId || filters.sportId || filters.status) && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400">Filters:</span>
          {filters.branchId && (
            <FilterPill
              label={eligibleBranches.find((b) => b.id === filters.branchId)?.name ?? 'Branch'}
              onRemove={() => onChange({ branchId: null, courtId: null })}
            />
          )}
          {filters.courtId && (
            <FilterPill
              label={eligibleCourts.find((c) => c.id === filters.courtId)?.name ?? 'Court'}
              onRemove={() => onChange({ courtId: null })}
            />
          )}
          {filters.sportId && (
            <FilterPill
              label={eligibleSports.find((s) => s.id === filters.sportId)?.name ?? 'Sport'}
              onRemove={() => onChange({ sportId: null })}
            />
          )}
          {filters.status && (
            <FilterPill
              label={SLOT_STATUS_CONFIG[filters.status].label}
              onRemove={() => onChange({ status: null })}
            />
          )}
          <button
            type="button"
            onClick={() => onChange({ branchId: null, courtId: null, sportId: null, status: null })}
            className="text-[11px] text-primary-600 hover:text-primary-800 focus:outline-none"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label:    string;
  onRemove: () => void;
}): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 border border-primary-200 px-2 py-0.5 text-[11px] font-medium text-primary-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-primary-400 hover:text-primary-600 focus:outline-none"
        aria-label={`Remove ${label} filter`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}
