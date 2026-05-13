'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { fetchCalendarSlots, slotKeys } from '@/lib/slot.api';
import { formatSlotTime, formatSlotPrice } from '@/types/slot.types';

interface SlotSelectionPanelProps {
  date:        string;
  courtId:     string;
  branchId:    string;
  selectedIds: string[];
  onChange:    (ids: string[]) => void;
  disabled?:   boolean;
}

/**
 * SlotSelectionPanel — shows available slots for a court on a given date.
 * Allows multi-select for consecutive slot booking.
 */
export function SlotSelectionPanel({
  date,
  courtId,
  branchId,
  selectedIds,
  onChange,
  disabled = false,
}: SlotSelectionPanelProps): React.ReactElement {
  const filters = useMemo(
    () => ({ date, courtId, branchId, sportId: null, status: 'available' as const }),
    [date, courtId, branchId],
  );

  const { data: slots = [], isLoading, error } = useQuery({
    queryKey: slotKeys.calendar(filters),
    queryFn:  () => fetchCalendarSlots(filters),
    enabled:  !!courtId && !!branchId,
    staleTime: 30_000,
  });

  const toggle = (id: string): void => {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id],
    );
  };

  const totalPrice = useMemo(() => {
    const sel = slots.filter((s) => selectedIds.includes(s.id));
    if (sel.length === 0 || sel.some((s) => s.resolvedPriceMinor === null)) return null;
    return sel.reduce((sum, s) => sum + (s.priceOverrideMinor ?? s.resolvedPriceMinor ?? 0), 0);
  }, [slots, selectedIds]);

  if (!courtId || !branchId) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
        <p className="text-xs text-gray-400">Select a branch and court to view available slots</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        Failed to load slots. Please try again.
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 py-8 text-center">
        <p className="text-sm font-medium text-gray-500">No available slots on this date</p>
        <p className="text-xs text-gray-400 mt-1">Try a different date or generate slots first</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {slots.length} slot{slots.length !== 1 ? 's' : ''} available
          {selectedIds.length > 0 && (
            <span className="ml-2 font-semibold text-primary-600">
              · {selectedIds.length} selected
            </span>
          )}
        </p>
        {totalPrice !== null && selectedIds.length > 0 && (
          <span className="text-xs font-semibold text-gray-700">
            Total:{' '}
            {new Intl.NumberFormat('en-GB', {
              style: 'currency', currency: slots[0]?.currency ?? 'GBP',
              minimumFractionDigits: 0,
            }).format(totalPrice / 100)}
          </span>
        )}
      </div>

      {/* Slot list */}
      <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-0.5">
        {slots.map((slot) => {
          const isSelected = selectedIds.includes(slot.id);
          const start = formatSlotTime(slot.startAt);
          const end   = formatSlotTime(slot.endAt);
          const price = formatSlotPrice(slot);

          return (
            <button
              key={slot.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(slot.id)}
              className={cn(
                'flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-left transition-all',
                'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-1',
                isSelected
                  ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-colors',
                    isSelected
                      ? 'border-primary-600 bg-primary-600'
                      : 'border-gray-300 bg-white',
                  )}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className={cn(
                    'text-sm font-mono font-semibold',
                    isSelected ? 'text-primary-800' : 'text-gray-800',
                  )}>
                    {start} – {end}
                  </p>
                  <p className="text-[10px] text-gray-400">{slot.durationMins} min</p>
                </div>
              </div>
              <span className={cn(
                'text-xs font-medium',
                isSelected ? 'text-primary-700' : 'text-gray-600',
              )}>
                {price}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
