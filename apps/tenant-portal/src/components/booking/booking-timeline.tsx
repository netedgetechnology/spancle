'use client';

import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { cn }                          from '@/lib/utils/cn';
import {
  SLOT_STATUS_CONFIG,
  groupSlotsByCourt,
  formatSlotTime,
  type Slot,
} from '@/types/slot.types';
import type { Court } from '@/types/court.types';

// ── Grid constants ────────────────────────────────────────────────────────────

const GRID_START_H  = 6;
const GRID_END_H    = 23;
const TOTAL_HOURS   = GRID_END_H - GRID_START_H;
const TOTAL_MINS    = TOTAL_HOURS * 60;
const TIME_COL_W    = 64;
const COURT_ROW_H   = 72;
const HEADER_H      = 36;
const MIN_DRAG_MINS = 30;  // minimum slot created by drag

const LEGEND = [
  { color: 'bg-emerald-500', label: 'Available'  },
  { color: 'bg-amber-400',   label: 'Reserved'   },
  { color: 'bg-blue-600',    label: 'Booked'     },
  { color: 'bg-red-400',     label: 'Conflict'   },
  { color: 'bg-gray-200',    label: 'Unavailable'},
] as const;

// ── Time helpers ──────────────────────────────────────────────────────────────

function pctOfDay(isoTime: string): number {
  const d    = new Date(isoTime);
  const mins = (d.getUTCHours() - GRID_START_H) * 60 + d.getUTCMinutes();
  return Math.max(0, Math.min(100, (mins / TOTAL_MINS) * 100));
}

function durationPct(startIso: string, endIso: string): number {
  const dur = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000;
  return Math.max(0, (dur / TOTAL_MINS) * 100);
}

function nowPct(): number {
  const n    = new Date();
  const mins = (n.getHours() - GRID_START_H) * 60 + n.getMinutes();
  return Math.max(0, Math.min(100, (mins / TOTAL_MINS) * 100));
}

function pxToMins(px: number, containerWidth: number): number {
  return Math.round(((px / containerWidth) * TOTAL_MINS) / MIN_DRAG_MINS) * MIN_DRAG_MINS;
}

// ── Drag-to-create ghost ──────────────────────────────────────────────────────

interface DragState {
  courtId:  string;
  startPct: number;
  endPct:   number;
  startMin: number;
  endMin:   number;
}

// ── Now indicator ─────────────────────────────────────────────────────────────

function NowLine(): React.ReactElement {
  const [pct, setPct] = useState(nowPct());

  useEffect(() => {
    const id = setInterval(() => setPct(nowPct()), 60_000);
    return () => clearInterval(id);
  }, []);

  if (pct <= 0 || pct >= 100) return <></>;
  return (
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
      style={{ left: `${pct}%` }}
    >
      <div className="absolute -top-1 -left-1 h-2.5 w-2.5 rounded-full bg-red-500" />
    </div>
  );
}

// ── Occupancy bar ─────────────────────────────────────────────────────────────

function OccupancyBar({ slots }: { slots: Slot[] }): React.ReactElement {
  const booked    = slots.filter((s) => s.status === 'booked'    || s.status === 'reserved').length;
  const available = slots.filter((s) => s.status === 'available').length;
  const total     = booked + available;
  const pct       = total > 0 ? Math.round((booked / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-0.5 w-full">
      <div className="flex justify-between text-[9px] text-gray-400 leading-none">
        <span>{booked}/{total}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 90 ? 'bg-red-500' : pct >= 60 ? 'bg-amber-400' : 'bg-emerald-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Slot block ────────────────────────────────────────────────────────────────

interface SlotCellProps {
  slot:         Slot;
  isSelected:   boolean;
  isDragTarget: boolean;
  onAvailable:  (slot: Slot) => void;
  onBooked:     (slot: Slot) => void;
  onDragStart:  (slot: Slot, e: React.MouseEvent) => void;
}

function SlotCell({
  slot, isSelected, isDragTarget,
  onAvailable, onBooked, onDragStart,
}: SlotCellProps): React.ReactElement {
  const cfg      = SLOT_STATUS_CONFIG[slot.status];
  const leftPct  = pctOfDay(slot.startAt);
  const widthPct = durationPct(slot.startAt, slot.endAt);
  const isAvail  = slot.status === 'available';
  const isBooked = slot.status === 'booked' || slot.status === 'reserved';

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        if (isBooked) { e.stopPropagation(); onDragStart(slot, e); }
      }}
      onClick={() => {
        if (isAvail)  onAvailable(slot);
        if (isBooked) onBooked(slot);
      }}
      disabled={!isAvail && !isBooked}
      aria-pressed={isSelected}
      title={`${formatSlotTime(slot.startAt)}–${formatSlotTime(slot.endAt)} · ${cfg.label}`}
      className={cn(
        'absolute top-1 bottom-1 rounded overflow-hidden transition-all select-none',
        'border-l-2 flex flex-col justify-center px-1.5 gap-0.5',
        cfg.bg, cfg.border,
        isSelected   && 'ring-2 ring-primary-500 ring-inset border-l-primary-600',
        isDragTarget && 'ring-2 ring-violet-500 ring-inset opacity-60',
        (isAvail || isBooked) ? 'cursor-pointer' : 'cursor-default',
        isBooked && 'cursor-grab active:cursor-grabbing',
      )}
      style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
    >
      <span className={cn('text-[10px] font-semibold leading-none block truncate', cfg.text)}>
        {formatSlotTime(slot.startAt)}
      </span>
      {isSelected && (
        <span className="text-[9px] font-bold text-primary-700 leading-none">✓</span>
      )}
      {isBooked && slot.bookingId && (
        <span className={cn('text-[9px] leading-none truncate', cfg.text)}>
          {slot.status === 'reserved' ? 'Reserved' : 'Booked'}
        </span>
      )}
    </button>
  );
}

// ── Court row ─────────────────────────────────────────────────────────────────

interface CourtRowProps {
  court:           Court;
  slots:           Slot[];
  selectedIds:     string[];
  dragTarget:      string | null;  // slotId being drag-rescheduled over this row
  onAvailableClick: (slot: Slot) => void;
  onBookedClick:    (slot: Slot) => void;
  onDragStart:      (slot: Slot, e: React.MouseEvent) => void;
  onLaneMouseDown:  (courtId: string, e: React.MouseEvent) => void;
  dragGhost:        DragState | null;
  dragOverCourtId:  string | null;
}

function CourtRow({
  court, slots, selectedIds, dragTarget,
  onAvailableClick, onBookedClick, onDragStart,
  onLaneMouseDown, dragGhost, dragOverCourtId,
}: CourtRowProps): React.ReactElement {
  const isGhostHere = dragGhost && dragOverCourtId === court.id;

  return (
    <div className="flex border-b border-gray-100 last:border-0 group/row" style={{ height: COURT_ROW_H + 'px' }}>
      {/* Court label + occupancy */}
      <div
        className="flex-shrink-0 flex flex-col justify-center px-2 border-r border-gray-100 bg-white gap-1"
        style={{ width: TIME_COL_W + 'px' }}
      >
        <span className="text-[10px] font-semibold text-gray-700 leading-tight truncate text-center">
          {court.name.length > 7 ? court.name.slice(0, 7) + '…' : court.name}
        </span>
        <OccupancyBar slots={slots} />
      </div>

      {/* Slots lane */}
      <div
        className="flex-1 relative"
        onMouseDown={(e) => onLaneMouseDown(court.id, e)}
      >
        {/* Half-hour grid lines */}
        {Array.from({ length: TOTAL_HOURS * 2 }, (_, i) => (
          <div
            key={i}
            className={cn(
              'absolute top-0 bottom-0 border-l pointer-events-none',
              i % 2 === 0 ? 'border-gray-100' : 'border-dashed border-gray-50',
            )}
            style={{ left: `${(i / (TOTAL_HOURS * 2)) * 100}%` }}
          />
        ))}

        {/* Now line */}
        <NowLine />

        {/* Slot blocks */}
        {slots.map((slot) => (
          <SlotCell
            key={slot.id}
            slot={slot}
            isSelected={selectedIds.includes(slot.id)}
            isDragTarget={dragTarget === slot.id}
            onAvailable={onAvailableClick}
            onBooked={onBookedClick}
            onDragStart={onDragStart}
          />
        ))}

        {/* Drag-to-create ghost */}
        {isGhostHere && (
          <div
            className="absolute top-1 bottom-1 rounded bg-primary-200 border-l-2 border-primary-500 opacity-80 pointer-events-none flex items-center px-2 z-10"
            style={{
              left:  `${dragGhost.startPct}%`,
              width: `${dragGhost.endPct - dragGhost.startPct}%`,
            }}
          >
            <span className="text-[10px] font-semibold text-primary-800">
              {`${GRID_START_H}:00`.slice(0, 2)}
              {/* Show start min */}
              {Math.floor((GRID_START_H * 60 + dragGhost.startMin) / 60).toString().padStart(2, '0')}:
              {((GRID_START_H * 60 + dragGhost.startMin) % 60).toString().padStart(2, '0')}
              {' – '}
              {Math.floor((GRID_START_H * 60 + dragGhost.endMin) / 60).toString().padStart(2, '0')}:
              {((GRID_START_H * 60 + dragGhost.endMin) % 60).toString().padStart(2, '0')}
            </span>
          </div>
        )}

        {/* Empty row placeholder */}
        {slots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] text-gray-200">No slots generated</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRow(): React.ReactElement {
  return (
    <div className="flex border-b border-gray-100 animate-pulse" style={{ height: COURT_ROW_H + 'px' }}>
      <div className="flex-shrink-0 px-2 flex items-center" style={{ width: TIME_COL_W + 'px' }}>
        <div className="h-3 w-10 bg-gray-200 rounded mx-auto" />
      </div>
      <div className="flex-1 px-2 flex items-center gap-2">
        {[28, 12, 40, 18, 28].map((w, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface DragCreateResult {
  courtId:  string;
  startMin: number;   // minutes from GRID_START_H
  endMin:   number;
}

export interface DragRescheduleResult {
  slot:       Slot;
  newCourtId: string;
  newStartMin: number;
}

export interface BookingTimelineProps {
  slots:              Slot[];
  courts:             Court[];
  selectedSlotIds:    string[];
  onAvailableClick:   (slot: Slot) => void;
  onBookedClick:      (slot: Slot) => void;
  onDragCreate?:      (result: DragCreateResult) => void;
  onDragReschedule?:  (result: DragRescheduleResult) => void;
  isLoading:          boolean;
  date:               string;
}

export function BookingTimeline({
  slots, courts, selectedSlotIds,
  onAvailableClick, onBookedClick,
  onDragCreate, onDragReschedule,
  isLoading, date,
}: BookingTimelineProps): React.ReactElement {
  const scrollRef      = useRef<HTMLDivElement>(null);
  // Drag-to-create state
  const [dragGhost,       setDragGhost]       = useState<DragState | null>(null);
  const [dragOverCourtId, setDragOverCourtId] = useState<string | null>(null);
  const dragCreateRef = useRef<{ courtId: string; startX: number; startMin: number } | null>(null);

  // Drag-to-reschedule state
  const [rescheduleSlot, setRescheduleSlot]     = useState<Slot | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const dragRescheduleRef = useRef<{ slot: Slot; startX: number } | null>(null);

  // Scroll to current time on mount / date change
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nowH = new Date().getHours();
    if (nowH >= GRID_START_H && nowH <= GRID_END_H) {
      const pct = (nowH - GRID_START_H - 1) / TOTAL_HOURS;
      el.scrollLeft = Math.max(0, pct * (el.scrollWidth - el.clientWidth));
    }
  }, [date]);

  const slotsByCourt = useMemo(() => groupSlotsByCourt(slots), [slots]);
  const timeLabels   = useMemo(
    () => Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => GRID_START_H + i),
    [],
  );
  const dateLabel = new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Drag-to-create handlers ───────────────────────────────────────────────

  const handleLaneMouseDown = useCallback((courtId: string, e: React.MouseEvent) => {
    if (e.button !== 0 || !onDragCreate) return;
    if ((e.target as HTMLElement).closest('button')) return; // clicked a slot — not a lane click

    const lane = (e.currentTarget as HTMLElement);
    const rect = lane.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const startMin = pxToMins(relX, rect.width);

    dragCreateRef.current = { courtId, startX: e.clientX, startMin };
    setDragOverCourtId(courtId);
    setDragGhost({ courtId, startPct: (startMin / TOTAL_MINS) * 100, endPct: (startMin / TOTAL_MINS) * 100, startMin, endMin: startMin });
    e.preventDefault();
  }, [onDragCreate]);

  const handleSlotDragStart = useCallback((slot: Slot, e: React.MouseEvent) => {
    if (!onDragReschedule) return;
    dragRescheduleRef.current = { slot, startX: e.clientX };
    setRescheduleSlot(slot);
    e.preventDefault();
  }, [onDragReschedule]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // Drag-to-create
      if (dragCreateRef.current && dragGhost) {
        const lane = document.querySelector('[data-lane-id="' + dragCreateRef.current.courtId + '"]') as HTMLElement | null;
        if (!lane) return;
        const rect   = lane.getBoundingClientRect();
        const relX   = e.clientX - rect.left;
        const endMin = Math.min(TOTAL_MINS, pxToMins(relX, rect.width));
        const start  = Math.min(dragCreateRef.current.startMin, endMin);
        const end    = Math.max(dragCreateRef.current.startMin, endMin);
        setDragGhost({
          courtId:  dragCreateRef.current.courtId,
          startPct: (start / TOTAL_MINS) * 100,
          endPct:   (end   / TOTAL_MINS) * 100,
          startMin: start,
          endMin:   end,
        });
      }

      // Drag-to-reschedule — just track which slot we're hovering
      if (dragRescheduleRef.current) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotBtn = el?.closest<HTMLElement>('[data-slot-id]');
        setRescheduleTarget(slotBtn?.dataset['slotId'] ?? null);
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      // Drag-to-create end
      if (dragCreateRef.current && dragGhost) {
        const { startMin, endMin } = dragGhost;
        if (endMin - startMin >= MIN_DRAG_MINS) {
          onDragCreate?.({ courtId: dragCreateRef.current.courtId, startMin, endMin });
        }
        dragCreateRef.current = null;
        setDragGhost(null);
        setDragOverCourtId(null);
      }

      // Drag-to-reschedule end
      if (dragRescheduleRef.current) {
        const el       = document.elementFromPoint(e.clientX, e.clientY);
        const rowEl    = el?.closest<HTMLElement>('[data-court-row-id]');
        const newCourtId = rowEl?.dataset['courtRowId'];
        if (newCourtId) {
          const lane = rowEl?.querySelector<HTMLElement>('[data-lane-id]');
          if (lane) {
            const rect       = lane.getBoundingClientRect();
            const relX       = e.clientX - rect.left;
            const newStartMin = pxToMins(relX, rect.width);
            onDragReschedule?.({
              slot:        dragRescheduleRef.current.slot,
              newCourtId,
              newStartMin,
            });
          }
        }
        dragRescheduleRef.current = null;
        setRescheduleSlot(null);
        setRescheduleTarget(null);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, [dragGhost, onDragCreate, onDragReschedule]);

  return (
    <div
      className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      style={{ cursor: rescheduleSlot ? 'grabbing' : undefined }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between gap-4">
        <p className="text-sm font-semibold text-gray-900 truncate">{dateLabel}</p>
        <div className="flex items-center gap-3 flex-shrink-0">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <span className={cn('h-2 w-2 rounded-sm flex-shrink-0', l.color)} />
              <span className="text-[10px] text-gray-400 hidden lg:block">{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* Time header */}
        <div className="flex-shrink-0 flex border-b border-gray-100 bg-white">
          <div className="flex-shrink-0" style={{ width: TIME_COL_W + 'px' }} />
          <div className="flex-1 relative" style={{ height: HEADER_H + 'px' }}>
            {timeLabels.map((h, i) => (
              <div
                key={h}
                className="absolute flex items-center"
                style={{
                  left:      `${(i / TOTAL_HOURS) * 100}%`,
                  height:    HEADER_H + 'px',
                  transform: 'translateX(-50%)',
                }}
              >
                <span className="text-[10px] font-mono text-gray-400 px-0.5">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <div ref={scrollRef} className="flex-1 overflow-auto">
          {isLoading ? (
            <>{[1, 2, 3].map((n) => <SkeletonRow key={n} />)}</>
          ) : courts.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-gray-400">Select a venue to view courts</p>
            </div>
          ) : (
            courts.map((court) => (
              <div
                key={court.id}
                data-court-row-id={court.id}
              >
                <CourtRow
                  court={court}
                  slots={slotsByCourt.get(court.id) ?? []}
                  selectedIds={selectedSlotIds}
                  dragTarget={rescheduleTarget}
                  onAvailableClick={onAvailableClick}
                  onBookedClick={onBookedClick}
                  onDragStart={handleSlotDragStart}
                  onLaneMouseDown={handleLaneMouseDown}
                  dragGhost={dragGhost}
                  dragOverCourtId={dragOverCourtId}
                />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reschedule drag hint */}
      {rescheduleSlot && (
        <div className="flex-shrink-0 border-t border-violet-200 bg-violet-50 px-4 py-1.5 text-xs text-violet-700 font-medium">
          Dragging: {rescheduleSlot.bookingId ? 'booking' : 'slot'} · Drop on a new time to reschedule
        </div>
      )}
    </div>
  );
}
