'use client';

import { useMemo, useRef, useEffect } from 'react';
import { cn }                          from '@/lib/utils/cn';
import {
  SLOT_STATUS_CONFIG,
  groupSlotsByCourt,
  formatSlotTime,
  type Slot,
} from '@/types/slot.types';
import type { Court } from '@/types/court.types';

// ── Grid constants ────────────────────────────────────────────────────────────

const GRID_START_H   = 6;    // 06:00
const GRID_END_H     = 23;   // 23:00
const TOTAL_HOURS    = GRID_END_H - GRID_START_H;
const TOTAL_MINS     = TOTAL_HOURS * 60;
const TIME_COL_W     = 56;   // px — fixed left column
const COURT_ROW_H    = 72;   // px — each court row height
const HEADER_H       = 40;   // px — time header height

// Legend items matching the brief colours
const LEGEND = [
  { color: 'bg-emerald-500', label: 'Available'   },
  { color: 'bg-amber-400',   label: 'Reserved'    },
  { color: 'bg-blue-600',    label: 'Booked'      },
  { color: 'bg-yellow-400',  label: 'Maintenance' },
  { color: 'bg-gray-200',    label: 'Break'       },
  { color: 'bg-gray-800',    label: 'Closed'      },
] as const;

function pctOfDay(isoTime: string): number {
  const d = new Date(isoTime);
  const mins = (d.getUTCHours() - GRID_START_H) * 60 + d.getUTCMinutes();
  return Math.max(0, Math.min(100, (mins / TOTAL_MINS) * 100));
}

function durationPct(startIso: string, endIso: string): number {
  const durationMins = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000;
  return Math.max(0, (durationMins / TOTAL_MINS) * 100);
}

// ── Slot block inside a court row ─────────────────────────────────────────────

interface SlotCellProps {
  slot:        Slot;
  isSelected:  boolean;
  onAvailable: (slot: Slot) => void;
  onBooked:    (slot: Slot) => void;
}

function SlotCell({ slot, isSelected, onAvailable, onBooked }: SlotCellProps): React.ReactElement {
  const cfg        = SLOT_STATUS_CONFIG[slot.status];
  const leftPct    = pctOfDay(slot.startAt);
  const widthPct   = durationPct(slot.startAt, slot.endAt);
  const isAvail    = slot.status === 'available';
  const isBookedSt = slot.status === 'booked';

  const handleClick = () => {
    if (isAvail)    onAvailable(slot);
    if (isBookedSt) onBooked(slot);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isAvail && !isBookedSt}
      aria-pressed={isSelected}
      title={`${formatSlotTime(slot.startAt)}–${formatSlotTime(slot.endAt)} · ${cfg.label}`}
      className={cn(
        'absolute top-1 bottom-1 rounded transition-all overflow-hidden',
        'border-l-2 flex flex-col justify-center px-1.5',
        cfg.bg,
        cfg.border,
        isSelected && 'ring-2 ring-primary-500 ring-inset border-l-primary-600',
        (isAvail || isBookedSt) ? 'cursor-pointer' : 'cursor-default',
      )}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
    >
      <span className={cn('text-[10px] font-semibold leading-none block truncate', cfg.text)}>
        {formatSlotTime(slot.startAt)}
      </span>
      {isSelected && (
        <span className="text-[9px] font-bold text-primary-700 leading-none block mt-0.5">✓</span>
      )}
      {isBookedSt && (
        <span className={cn('text-[9px] leading-none block mt-0.5 truncate', cfg.text)}>Booked</span>
      )}
    </button>
  );
}

// ── Court row ─────────────────────────────────────────────────────────────────

interface CourtRowProps {
  court:          Court;
  slots:          Slot[];
  selectedIds:    string[];
  onAvailableClick: (slot: Slot) => void;
  onBookedClick:    (slot: Slot) => void;
}

function CourtRow({ court, slots, selectedIds, onAvailableClick, onBookedClick }: CourtRowProps): React.ReactElement {
  return (
    <div className="flex" style={{ height: COURT_ROW_H + 'px' }}>
      {/* Court label */}
      <div
        className="flex-shrink-0 flex flex-col justify-center px-3 border-r border-gray-100 bg-white"
        style={{ width: TIME_COL_W + 'px' }}
      >
        <span className="text-[11px] font-semibold text-gray-700 leading-tight truncate w-full text-center">
          {court.name.length > 6 ? court.name.slice(0, 6) + '…' : court.name}
        </span>
      </div>

      {/* Slots lane */}
      <div className="flex-1 relative border-b border-gray-100">
        {/* Half-hour grid lines */}
        {Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => (
          <div
            key={i}
            className={cn('absolute top-0 bottom-0 border-l', i % 2 === 0 ? 'border-gray-100' : 'border-dashed border-gray-50')}
            style={{ left: `${(i / (TOTAL_HOURS * 2)) * 100}%` }}
          />
        ))}

        {/* Slot blocks */}
        {slots.map((slot) => (
          <SlotCell
            key={slot.id}
            slot={slot}
            isSelected={selectedIds.includes(slot.id)}
            onAvailable={onAvailableClick}
            onBooked={onBookedClick}
          />
        ))}

        {/* Empty row indicator */}
        {slots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-gray-300">No slots</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow(): React.ReactElement {
  return (
    <div className="flex border-b border-gray-100 animate-pulse" style={{ height: COURT_ROW_H + 'px' }}>
      <div className="flex-shrink-0 px-3 flex items-center" style={{ width: TIME_COL_W + 'px' }}>
        <div className="h-3 w-8 bg-gray-200 rounded mx-auto" />
      </div>
      <div className="flex-1 px-2 flex items-center gap-2">
        {[30, 15, 45, 20, 30].map((w, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface BookingTimelineProps {
  slots:           Slot[];
  courts:          Court[];
  selectedSlotIds: string[];
  onAvailableClick: (slot: Slot) => void;
  onBookedClick:    (slot: Slot) => void;
  isLoading:       boolean;
  date:            string; // YYYY-MM-DD
}

export function BookingTimeline({
  slots, courts, selectedSlotIds, onAvailableClick,
  onBookedClick, isLoading, date,
}: BookingTimelineProps): React.ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to current time on mount / date change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nowH = new Date().getUTCHours();
    if (nowH >= GRID_START_H && nowH <= GRID_END_H) {
      const pct = ((nowH - GRID_START_H) / TOTAL_HOURS);
      el.scrollLeft = pct * (el.scrollWidth - el.clientWidth);
    }
  }, [date]);

  const slotsByCourt = useMemo(() => groupSlotsByCourt(slots), [slots]);

  // Time labels: 06:00, 07:00, … 23:00
  const timeLabels = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => GRID_START_H + i),
    [],
  );

  const dateLabel = new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header bar */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-gray-900 truncate">{dateLabel}</p>

        {/* Legend */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <span className={cn('h-2.5 w-2.5 rounded-sm flex-shrink-0', l.color)} />
              <span className="text-[10px] text-gray-500 hidden lg:block">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Sticky time header */}
        <div className="flex-shrink-0 flex border-b border-gray-200 sticky top-0 z-10 bg-white">
          <div className="flex-shrink-0" style={{ width: TIME_COL_W + 'px' }} />
          <div className="flex-1 relative" style={{ height: HEADER_H + 'px' }}>
            {timeLabels.map((h, i) => (
              <div
                key={h}
                className="absolute flex items-center justify-start"
                style={{
                  left:   `${(i / TOTAL_HOURS) * 100}%`,
                  height: HEADER_H + 'px',
                  transform: 'translateX(-50%)',
                }}
              >
                <span className="text-[10px] font-mono text-gray-400 leading-none px-0.5">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Court rows — scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          {isLoading ? (
            <>
              {[1, 2, 3].map((n) => <SkeletonRow key={n} />)}
            </>
          ) : courts.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-gray-400">Select a venue to view courts</p>
            </div>
          ) : (
            courts.map((court) => (
              <CourtRow
                key={court.id}
                court={court}
                slots={slotsByCourt.get(court.id) ?? []}
                selectedIds={selectedSlotIds}
                onAvailableClick={onAvailableClick}
                onBookedClick={onBookedClick}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
