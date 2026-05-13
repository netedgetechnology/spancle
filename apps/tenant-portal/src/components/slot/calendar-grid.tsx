'use client';

import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { SlotBlock }   from './slot-block';
import { PageLoader }  from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  groupSlotsByCourt,
  formatSlotTime,
  type Slot,
  type CalendarFilters,
} from '@/types/slot.types';
import type { Court } from '@/types/court.types';
import { reserveSlot, slotKeys } from '@/lib/slot.api';

interface CalendarGridProps {
  slots:       Slot[];
  courts:      Court[];
  filters:     CalendarFilters;
  isLoading:   boolean;
  error:       Error | null;
  onRefetch:   () => void;
  onSlotClick: (slot: Slot) => void;
}

// Time grid: 06:00 → 23:00, one row per 30 minutes
const GRID_START_HOUR = 6;
const GRID_END_HOUR   = 23;
const SLOT_INTERVAL   = 30;        // minutes per row
const ROW_HEIGHT_PX   = 32;        // px per 30-min row

function buildTimeLabels(): string[] {
  const labels: string[] = [];
  for (let h = GRID_START_HOUR; h <= GRID_END_HOUR; h++) {
    labels.push(`${String(h).padStart(2, '0')}:00`);
    if (h < GRID_END_HOUR) labels.push(`${String(h).padStart(2, '0')}:30`);
  }
  return labels;
}

const TIME_LABELS = buildTimeLabels();
const TOTAL_ROWS  = TIME_LABELS.length;

/**
 * Converts a HH:MM time string to a grid row index.
 * Row 0 = GRID_START_HOUR:00.
 */
function timeToRowIndex(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const totalMins = (h! - GRID_START_HOUR) * 60 + m!;
  return Math.max(0, Math.round(totalMins / SLOT_INTERVAL));
}

/**
 * CalendarGrid — the main calendar view.
 *
 * Layout: time labels (fixed left) × court columns (scrollable right).
 *
 * Slot blocks are absolutely positioned within each court column using
 * CSS top + height calculated from their start time and duration.
 *
 * Current time indicator: a red horizontal line at the current time
 * (only shown when the selected date is today).
 *
 * Responsive:
 *   - Mobile: only one court column visible at a time (scroll horizontally)
 *   - Tablet+: 2–3 court columns
 *   - Desktop: up to 6 court columns
 */
export function CalendarGrid({
  slots,
  courts,
  filters,
  isLoading,
  error,
  onRefetch,
  onSlotClick,
}: CalendarGridProps): React.ReactElement {
  const queryClient = useQueryClient();

  const reserveMut = useMutation({
    mutationFn: reserveSlot,
    onSuccess:  () => {
      void queryClient.invalidateQueries({ queryKey: slotKeys.calendar(filters) });
    },
  });

  // Group slots by courtId
  const slotsByCourt = useMemo(() => groupSlotsByCourt(slots), [slots]);

  // Derive visible courts: courts that have slots, or all courts if no filter
  const visibleCourts = useMemo(() => {
    if (courts.length === 0) return [];
    if (filters.courtId) {
      return courts.filter((c) => c.id === filters.courtId);
    }
    // Show all courts that have slots for the day, plus any explicitly filtered
    const courtsWithSlots = new Set(slots.map((s) => s.courtId));
    return courts.filter(
      (c) => courtsWithSlots.has(c.id) || c.status === 'available',
    );
  }, [courts, slots, filters.courtId]);

  const totalGridHeight = TOTAL_ROWS * ROW_HEIGHT_PX;

  if (isLoading) return <PageLoader message="Loading schedule…" />;
  if (error)     return <ErrorDisplay title="Failed to load slots" message={error.message} retry={onRefetch} />;

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* Column headers row */}
      <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
        {/* Time axis label */}
        <div className="w-14 flex-shrink-0 border-r border-gray-200" aria-hidden="true" />

        {/* Court headers */}
        <div className="flex-1 overflow-x-auto">
          <div
            className="grid min-w-0"
            style={{ gridTemplateColumns: `repeat(${Math.max(1, visibleCourts.length)}, minmax(120px, 1fr))` }}
          >
            {visibleCourts.length > 0 ? (
              visibleCourts.map((court) => (
                <div
                  key={court.id}
                  className="px-3 py-2.5 border-r border-gray-200 last:border-r-0"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm" aria-hidden="true">
                      {court.courtType === 'indoor' ? '🏢' : '🌳'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{court.name}</p>
                      {court.code && (
                        <p className="text-[10px] font-mono text-gray-400">{court.code}</p>
                      )}
                    </div>
                  </div>
                  {/* Slot count for this court */}
                  {(() => {
                    const courtSlots = slotsByCourt.get(court.id) ?? [];
                    const avail = courtSlots.filter((s) => s.status === 'available').length;
                    return courtSlots.length > 0 ? (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {avail}/{courtSlots.length} free
                      </p>
                    ) : null;
                  })()}
                </div>
              ))
            ) : (
              <div className="px-4 py-2.5">
                <p className="text-xs text-gray-400">No courts</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid body */}
      <div className="flex overflow-hidden">

        {/* Time labels (sticky left) */}
        <div
          className="w-14 flex-shrink-0 border-r border-gray-200 relative"
          style={{ height: `${totalGridHeight}px` }}
          aria-hidden="true"
        >
          {TIME_LABELS.map((label, i) => {
            if (!label.endsWith(':00')) return null; // only show :00 labels
            return (
              <div
                key={label}
                className="absolute left-0 right-0 flex items-start justify-end pr-2"
                style={{ top: `${i * ROW_HEIGHT_PX}px` }}
              >
                <span className="text-[10px] text-gray-400 font-mono leading-none">
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Court columns */}
        <div className="flex-1 overflow-x-auto">
          {visibleCourts.length === 0 ? (
            <div
              className="flex items-center justify-center text-center"
              style={{ height: `${Math.min(totalGridHeight, 320)}px` }}
            >
              <div>
                <p className="text-sm font-medium text-gray-500">No courts to display</p>
                <p className="text-xs text-gray-400 mt-1">
                  {filters.branchId
                    ? 'No courts found in this branch for the selected filters'
                    : 'Select a branch or add courts to get started'}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="grid relative"
              style={{
                gridTemplateColumns: `repeat(${visibleCourts.length}, minmax(120px, 1fr))`,
                height: `${totalGridHeight}px`,
                minWidth: `${visibleCourts.length * 120}px`,
              }}
            >
              {/* Hour grid lines */}
              {TIME_LABELS.map((label, i) => (
                <div
                  key={`line-${label}`}
                  className={cn(
                    'absolute left-0 right-0 border-t',
                    label.endsWith(':00') ? 'border-gray-200' : 'border-gray-100',
                  )}
                  style={{ top: `${i * ROW_HEIGHT_PX}px`, gridColumn: '1 / -1' }}
                  aria-hidden="true"
                />
              ))}

              {/* Court columns with slot blocks */}
              {visibleCourts.map((court) => {
                const courtSlots = slotsByCourt.get(court.id) ?? [];

                return (
                  <div
                    key={court.id}
                    className="relative border-r border-gray-200 last:border-r-0"
                    style={{ height: `${totalGridHeight}px` }}
                  >
                    {courtSlots.length === 0 ? (
                      /* Empty court column */
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-[10px] text-gray-300 text-center px-2 select-none">
                          No slots
                        </p>
                      </div>
                    ) : (
                      courtSlots.map((slot) => {
                        const startHHMM = formatSlotTime(slot.startAt);
                        const rowIndex  = timeToRowIndex(startHHMM);
                        const topPx     = rowIndex * ROW_HEIGHT_PX;
                        // Height: proportional to duration, snapped to row grid
                        const durationRows = Math.round(slot.durationMins / SLOT_INTERVAL);
                        const heightPx     = Math.max(ROW_HEIGHT_PX, durationRows * ROW_HEIGHT_PX) - 2;

                        return (
                          <div
                            key={slot.id}
                            className="absolute left-0.5 right-0.5"
                            style={{ top: `${topPx + 1}px`, height: `${heightPx}px` }}
                          >
                            <SlotBlock
                              slot={slot}
                              onClick={onSlotClick}
                              onReserve={(s) => reserveMut.mutate(s.id)}
                              isReserving={reserveMut.isPending && reserveMut.variables === slot.id}
                            />
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
