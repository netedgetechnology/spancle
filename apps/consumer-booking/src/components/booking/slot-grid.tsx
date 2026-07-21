'use client';

import { cn }                     from '@/lib/utils/cn';
import {
  SLOT_STATUS_CONFIG,
  formatTime,
  formatPrice,
  slotPrice,
  type Slot,
}                                  from '@/types/booking.types';

interface SlotGridProps {
  slots:        Slot[];
  selectedIds:  string[];
  onToggle:     (slot: Slot) => void;
  isLoading?:   boolean;
  className?:   string;
}

/**
 * SlotGrid — renders a day's slots as a selectable grid.
 *
 * - available: selectable, highlights on hover/selected
 * - reserved/booked/unavailable: non-selectable, visually dimmed
 * - Multi-select supported: clicking already-selected slot deselects it
 */
export function SlotGrid({
  slots,
  selectedIds,
  onToggle,
  isLoading,
  className,
}: SlotGridProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 animate-pulse', className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No slots available for this date</p>
        <p className="mt-1 text-xs text-gray-400">Try selecting a different date or court</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3" role="legend" aria-label="Slot availability legend">
        {(['available', 'reserved', 'booked', 'unavailable'] as const).map((s) => {
          const cfg = SLOT_STATUS_CONFIG[s];
          return (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn('h-3 w-3 rounded-sm border', cfg.bg, cfg.border)} aria-hidden="true" />
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
        role="group"
        aria-label="Available time slots"
      >
        {slots.map((slot) => {
          const cfg      = SLOT_STATUS_CONFIG[slot.status];
          const selected = selectedIds.includes(slot.id);
          const price    = slotPrice(slot);

          return (
            <button
              key={slot.id}
              type="button"
              disabled={!cfg.selectable}
              onClick={() => cfg.selectable && onToggle(slot)}
              aria-pressed={selected}
              aria-label={`${formatTime(slot.startAt)} to ${formatTime(slot.endAt)}, ${cfg.label}${price ? `, ${formatPrice(price, slot.currency)}` : ''}`}
              className={cn(
                'relative flex flex-col rounded-xl border-2 p-3 text-left transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                cfg.selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                selected
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : cfg.selectable
                    ? cn('border-transparent', cfg.bg, 'hover:border-blue-300')
                    : cn('border-transparent', cfg.bg),
              )}
            >
              {/* Selected check */}
              {selected && (
                <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600" aria-hidden="true">
                  <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </span>
              )}

              <span className={cn('text-sm font-semibold', selected ? 'text-blue-900' : cfg.text)}>
                {formatTime(slot.startAt)}
              </span>
              <span className={cn('text-xs mt-0.5', selected ? 'text-blue-700' : cfg.text, 'opacity-80')}>
                – {formatTime(slot.endAt)}
              </span>
              {price != null && (
                <span className={cn('text-xs font-medium mt-1.5', selected ? 'text-blue-600' : cfg.text)}>
                  {formatPrice(price, slot.currency)}
                </span>
              )}
              {!cfg.selectable && (
                <span className="text-[10px] text-gray-400 mt-1">{cfg.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
