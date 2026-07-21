'use client';

/**
 * SlotPicker
 *
 * Self-contained date selector + slot availability grid.
 * Reused by:
 *   - /book wizard (step 3 + 4)
 *   - /bookings/[id]/reschedule
 *
 * Props:
 *   courtId / branchId — required to fetch availability
 *   selectedIds        — controlled multi-select state
 *   onToggle(slot)     — called when user clicks a slot
 *   onDateChange(d)    — called when date changes (so parent can reset selection)
 */

import { useState, useCallback }        from 'react';
import { useQuery }                      from '@tanstack/react-query';
import { SlotGrid }                      from './slot-grid';
import { fetchDaySlots, slotKeys }       from '@/lib/api/slot.api';
import type { Slot }                     from '@/types/booking.types';

interface SlotPickerProps {
  courtId:      string;
  branchId:     string;
  selectedIds:  string[];
  onToggle:     (slot: Slot) => void;
  onDateChange?: (date: string) => void;
  minDate?:     string;
  className?:   string;
}

function todayISO() { return new Date().toISOString().slice(0, 10); }

export function SlotPicker({
  courtId,
  branchId,
  selectedIds,
  onToggle,
  onDateChange,
  minDate,
  className,
}: SlotPickerProps): React.ReactElement {
  const [date, setDate] = useState(todayISO());

  const handleDateChange = useCallback((d: string) => {
    setDate(d);
    onDateChange?.(d);
  }, [onDateChange]);

  const { data: slots = [], isLoading, error, refetch } = useQuery({
    queryKey: slotKeys.availability(courtId, branchId, date),
    queryFn:  () => fetchDaySlots({ courtId, branchId, date }),
    enabled:  !!courtId && !!branchId,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  return (
    <div className={className}>
      {/* Date selector */}
      <div className="mb-4">
        <label htmlFor="slot-picker-date" className="block text-xs font-medium text-gray-700 mb-1.5">
          Select date
        </label>
        <input
          id="slot-picker-date"
          type="date"
          value={date}
          min={minDate ?? todayISO()}
          onChange={(e) => handleDateChange(e.target.value)}
          className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-3 flex items-center gap-2 text-sm text-red-500">
          <span>Failed to load slots.</span>
          <button type="button" onClick={() => void refetch()} className="underline text-blue-600 text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Slot grid */}
      <SlotGrid
        slots={slots}
        selectedIds={selectedIds}
        onToggle={onToggle}
        isLoading={isLoading}
      />
    </div>
  );
}
