'use client';

import { cn } from '@/lib/utils/cn';
import { SLOT_STATUS_CONFIG, formatSlotTime, type Slot } from '@/types/slot.types';

// Colours matching brief: 🟢 Available 🟠 Reserved 🔴 Booked 🟡 Maintenance ⚪ Break ⚫ Closed
const HOUR_HEIGHT_PX = 64; // px per hour
const GRID_START = 6;      // 06:00
const GRID_END   = 23;     // 23:00
const TOTAL_HOURS = GRID_END - GRID_START;

function minutesFromStart(date: Date): number {
  const h = date.getUTCHours();
  const m = date.getUTCMinutes();
  return (h - GRID_START) * 60 + m;
}

export function slotTopPct(slot: Slot): number {
  const mins = minutesFromStart(new Date(slot.startAt));
  return (mins / (TOTAL_HOURS * 60)) * 100;
}

export function slotHeightPct(slot: Slot): number {
  const start = new Date(slot.startAt);
  const end   = new Date(slot.endAt);
  const durationMins = (end.getTime() - start.getTime()) / 60_000;
  return (durationMins / (TOTAL_HOURS * 60)) * 100;
}

interface BookingTimelineProps {
  slots:          Slot[];
  selectedSlotIds: string[];
  onSlotClick:    (slot: Slot) => void;
  isLoading:      boolean;
  date:           string; // YYYY-MM-DD
}

export function BookingTimeline({
  slots, selectedSlotIds, onSlotClick, isLoading, date,
}: BookingTimelineProps): React.ReactElement {
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => GRID_START + i);
  const totalHeightPx = TOTAL_HOURS * HOUR_HEIGHT_PX;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          {new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {[
            { color: 'bg-emerald-500', label: 'Available' },
            { color: 'bg-amber-500',   label: 'Reserved'  },
            { color: 'bg-blue-600',    label: 'Booked'    },
            { color: 'bg-gray-400',    label: 'Other'     },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <span className={cn('h-2.5 w-2.5 rounded-sm flex-shrink-0', l.color)} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="flex" style={{ height: totalHeightPx + 'px' }}>
            {/* Time labels */}
            <div className="flex-shrink-0 w-14 border-r border-gray-100 relative">
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute w-full flex items-start justify-end pr-2"
                  style={{ top: (h - GRID_START) * HOUR_HEIGHT_PX - 8 + 'px', height: HOUR_HEIGHT_PX + 'px' }}
                >
                  <span className="text-[10px] font-mono text-gray-400 leading-none">
                    {String(h).padStart(2, '0')}:00
                  </span>
                </div>
              ))}
            </div>

            {/* Slot lane */}
            <div className="flex-1 relative">
              {/* Hour lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-gray-100"
                  style={{ top: (h - GRID_START) * HOUR_HEIGHT_PX + 'px' }}
                />
              ))}

              {/* Slot blocks */}
              {slots.map((slot) => {
                const topPct    = slotTopPct(slot);
                const heightPct = slotHeightPct(slot);
                const isSelected = selectedSlotIds.includes(slot.id);
                const cfg = SLOT_STATUS_CONFIG[slot.status];
                const isClickable = slot.status === 'available';

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!isClickable}
                    onClick={() => isClickable && onSlotClick(slot)}
                    aria-pressed={isSelected}
                    className={cn(
                      'absolute left-1 right-1 rounded transition-all text-left overflow-hidden',
                      'border-l-2 px-2',
                      cfg.bg, cfg.text, cfg.border,
                      isSelected && 'ring-2 ring-primary-500 ring-offset-1 border-l-primary-600',
                      isClickable ? 'cursor-pointer' : 'cursor-default',
                    )}
                    style={{
                      top:    `calc(${topPct}% + 2px)`,
                      height: `calc(${heightPct}% - 4px)`,
                    }}
                  >
                    <span className="text-[10px] font-semibold leading-tight block">
                      {formatSlotTime(slot.startAt)} – {formatSlotTime(slot.endAt)}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-primary-700 block">
                        Selected
                      </span>
                    )}
                    {slot.status === 'booked' && slot.bookingId && (
                      <span className="text-[9px] text-blue-600 block truncate">
                        Booked
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Empty state */}
              {slots.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs text-gray-400">No slots generated for this date</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
