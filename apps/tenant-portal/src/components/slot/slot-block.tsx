'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { SlotStatusBadge } from './slot-status-badge';
import {
  SLOT_STATUS_CONFIG,
  formatSlotTime,
  formatSlotPrice,
  formatCountdown,
  slotHeightPx,
  type Slot,
} from '@/types/slot.types';

interface SlotBlockProps {
  slot:        Slot;
  onClick:     (slot: Slot) => void;
  onReserve:   (slot: Slot) => void;
  isReserving?: boolean;
  compact?:    boolean;
}

/**
 * SlotBlock — a single slot cell in the calendar grid.
 *
 * Progressive rendering based on calculated height:
 *   height > 60px  → full: time, label, price, status badge
 *   height 40-60px → medium: time + status badge only
 *   height < 40px  → compact: time only, no padding
 *
 * States:
 *   available   → shows "Reserve" button on hover
 *   reserved    → shows live countdown timer + "Release" button
 *   booked      → shows booking reference, read-only
 *   cancelled   → muted, strikethrough time
 *   completed   → muted slate, no actions
 *   unavailable → hatched red, no actions
 */
export function SlotBlock({
  slot,
  onClick,
  onReserve,
  isReserving = false,
  compact     = false,
}: SlotBlockProps): React.ReactElement {
  const [countdown, setCountdown] = useState<string | null>(null);

  // Live countdown for reserved slots
  useEffect(() => {
    if (slot.status !== 'reserved' || !slot.reservedUntil) return;

    const tick = (): void => setCountdown(formatCountdown(slot.reservedUntil));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [slot.status, slot.reservedUntil]);

  const cfg    = SLOT_STATUS_CONFIG[slot.status];
  const height = slotHeightPx(slot.durationMins);
  const mode   = compact || height < 40 ? 'compact' : height < 60 ? 'medium' : 'full';

  const startTime = formatSlotTime(slot.startAt);
  const endTime   = formatSlotTime(slot.endAt);
  const price     = formatSlotPrice(slot);

  const isInteractive  = slot.status === 'available' || slot.status === 'reserved';
  const isCancelled    = slot.status === 'cancelled';
  const isUnavailable  = slot.status === 'unavailable';

  return (
    <button
      type="button"
      onClick={() => onClick(slot)}
      className={cn(
        'group relative w-full rounded-md border-l-[3px] text-left transition-all overflow-hidden',
        'focus:outline-none focus:ring-1 focus:ring-primary-400 focus:ring-offset-1',
        cfg.bg, cfg.text, cfg.border,
        mode === 'compact' ? 'px-1 py-0.5' : 'px-2 py-1',
        isCancelled  && 'opacity-50',
        isUnavailable && 'bg-stripes',
        !isInteractive && 'cursor-default',
      )}
      style={{ minHeight: `${Math.max(28, height)}px` }}
      aria-label={`${slot.label ?? `Slot ${startTime}–${endTime}`} — ${cfg.label}`}
    >
      {/* Compact mode: time only */}
      {mode === 'compact' && (
        <span className="text-[10px] font-mono leading-none truncate block">
          {startTime}
        </span>
      )}

      {/* Medium mode: time + badge */}
      {mode === 'medium' && (
        <div className="flex items-center justify-between gap-1">
          <span className="text-[11px] font-mono font-medium leading-none">
            {startTime}–{endTime}
          </span>
          <SlotStatusBadge status={slot.status} size="xs" />
        </div>
      )}

      {/* Full mode: all details */}
      {mode === 'full' && (
        <div className="flex flex-col gap-0.5 min-h-0">
          {/* Time row */}
          <div className="flex items-center justify-between gap-1">
            <span className="text-[11px] font-mono font-semibold leading-none">
              {startTime}–{endTime}
            </span>
            <SlotStatusBadge status={slot.status} size="xs" />
          </div>

          {/* Label */}
          {slot.label && (
            <p className={cn(
              'text-[10px] leading-tight truncate mt-0.5',
              isCancelled && 'line-through',
            )}>
              {slot.label}
            </p>
          )}

          {/* Price + countdown row */}
          <div className="flex items-center justify-between gap-1 mt-auto pt-0.5">
            <span className="text-[10px] font-medium opacity-80">{price}</span>
            {slot.status === 'reserved' && countdown && (
              <span className="text-[9px] font-mono font-semibold text-amber-600 bg-amber-50 rounded px-1">
                ⏱ {countdown}
              </span>
            )}
            {slot.currentBookings > 0 && slot.maxBookings > 1 && (
              <span className="text-[9px] text-gray-500">
                {slot.currentBookings}/{slot.maxBookings}
              </span>
            )}
          </div>

          {/* Reserve button — appears on hover for available slots */}
          {slot.status === 'available' && (
            <div className="mt-1 hidden group-hover:block">
              <button
                type="button"
                disabled={isReserving}
                onClick={(e) => {
                  e.stopPropagation();
                  onReserve(slot);
                }}
                className={cn(
                  'w-full rounded text-[10px] font-semibold py-0.5 transition-colors',
                  'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50',
                )}
              >
                {isReserving ? '…' : 'Reserve'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Unavailable overlay hatching */}
      {isUnavailable && (
        <div
          className="absolute inset-0 rounded-md pointer-events-none"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(239,68,68,0.08) 3px, rgba(239,68,68,0.08) 6px)',
          }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
