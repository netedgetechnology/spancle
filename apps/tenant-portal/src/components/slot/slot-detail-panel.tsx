'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }              from '@/lib/utils/cn';
import { SlotStatusBadge } from './slot-status-badge';
import {
  formatSlotTime,
  formatSlotPrice,
  formatCountdown,
  type Slot,
  type CalendarFilters,
} from '@/types/slot.types';
import {
  reserveSlot,
  releaseSlot,
  cancelSlot,
  slotKeys,
} from '@/lib/slot.api';

interface SlotDetailPanelProps {
  slot:      Slot | null;
  filters:   CalendarFilters;
  onClose:   () => void;
}

/**
 * SlotDetailPanel — fixed right-side panel for slot details + admin actions.
 *
 * Shows:
 *   - Slot time window, duration, court/branch/sport IDs
 *   - Status badge + price (with override indicator)
 *   - Reservation countdown for 'reserved' slots
 *   - Applied pricing rule IDs (for auditing)
 *   - Actions: Reserve | Release | Cancel (context-sensitive)
 *   - Booking reference when booked
 */
export function SlotDetailPanel({
  slot,
  filters,
  onClose,
}: SlotDetailPanelProps): React.ReactElement {
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!slot || slot.status !== 'reserved' || !slot.reservedUntil) {
      setCountdown(null);
      return;
    }
    const tick = (): void => setCountdown(formatCountdown(slot.reservedUntil));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [slot?.status, slot?.reservedUntil]);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: slotKeys.calendar(filters) });
  };

  const reserveMut = useMutation({
    mutationFn: () => reserveSlot(slot!.id),
    onSuccess:  invalidate,
  });
  const releaseMut = useMutation({
    mutationFn: () => releaseSlot(slot!.id),
    onSuccess:  invalidate,
  });
  const cancelMut  = useMutation({
    mutationFn: () => cancelSlot(slot!.id),
    onSuccess:  invalidate,
  });

  const isOpen = !!slot;
  const isBusy = reserveMut.isPending || releaseMut.isPending || cancelMut.isPending;

  return (
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          'fixed right-0 top-0 z-40 h-full w-80 bg-white shadow-2xl border-l border-gray-200',
          'flex flex-col transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-label="Slot details"
        role="complementary"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Slot details</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
            aria-label="Close panel"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {slot ? (
          <div className="flex-1 overflow-y-auto">

            {/* Status + time */}
            <div className="px-5 py-4 border-b border-gray-50">
              <div className="flex items-center justify-between mb-2">
                <SlotStatusBadge status={slot.status} size="sm" />
                {slot.status === 'reserved' && countdown && (
                  <span className="text-xs font-mono font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
                    ⏱ {countdown}
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatSlotTime(slot.startAt)}
                </span>
                <span className="text-sm text-gray-400">—</span>
                <span className="text-2xl font-bold text-gray-900 font-mono">
                  {formatSlotTime(slot.endAt)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {slot.durationMins} min · {new Date(slot.startAt).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
              </p>

              {slot.label && (
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">{slot.label}</p>
              )}
            </div>

            {/* Price */}
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pricing</p>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-gray-900">
                  {formatSlotPrice(slot)}
                </span>
                {slot.priceOverrideMinor !== null && (
                  <span className="text-xs text-amber-600 font-medium bg-amber-50 rounded px-1.5 py-0.5">
                    Override
                  </span>
                )}
              </div>
              {slot.resolvedPriceMinor !== null && slot.priceOverrideMinor !== null && (
                <p className="text-xs text-gray-400 mt-0.5 line-through">
                  {new Intl.NumberFormat('en-GB', { style: 'currency', currency: slot.currency, minimumFractionDigits: 0 }).format(slot.resolvedPriceMinor / 100)} (list)
                </p>
              )}
              {slot.appliedRuleIds && slot.appliedRuleIds.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">
                  {slot.appliedRuleIds.length} pricing rule{slot.appliedRuleIds.length !== 1 ? 's' : ''} applied
                </p>
              )}
            </div>

            {/* Bookings */}
            {(slot.bookingId || slot.maxBookings > 1) && (
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Bookings</p>
                {slot.bookingId && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-700">
                    <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-mono">{slot.bookingId.slice(0, 8)}…</span>
                  </div>
                )}
                {slot.maxBookings > 1 && (
                  <p className="text-xs text-gray-600 mt-1">
                    {slot.currentBookings} / {slot.maxBookings} bookings
                    <span className="ml-1 text-gray-400">
                      ({Math.round((slot.currentBookings / slot.maxBookings) * 100)}% full)
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* Notes */}
            {slot.notes && (
              <div className="px-5 py-4 border-b border-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                <p className="text-sm text-gray-700 leading-relaxed">{slot.notes}</p>
              </div>
            )}

            {/* IDs */}
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">References</p>
              <dl className="space-y-1 text-[10px] font-mono text-gray-400">
                <div className="flex gap-2"><dt className="w-12 text-gray-300">Slot</dt><dd>{slot.id.slice(0, 12)}…</dd></div>
                <div className="flex gap-2"><dt className="w-12 text-gray-300">Court</dt><dd>{slot.courtId.slice(0, 12)}…</dd></div>
                {slot.templateId && (
                  <div className="flex gap-2"><dt className="w-12 text-gray-300">Tmpl</dt><dd>{slot.templateId.slice(0, 12)}…</dd></div>
                )}
              </dl>
            </div>

            {/* Error state */}
            {(reserveMut.error || releaseMut.error || cancelMut.error) && (
              <div className="mx-5 mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-xs text-red-700">
                  {((reserveMut.error ?? releaseMut.error ?? cancelMut.error) as Error).message}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="px-5 py-4 flex flex-col gap-2">
              {slot.status === 'available' && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => reserveMut.mutate()}
                  className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {reserveMut.isPending ? 'Reserving…' : 'Reserve slot'}
                </button>
              )}
              {slot.status === 'reserved' && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => releaseMut.mutate()}
                  className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {releaseMut.isPending ? 'Releasing…' : 'Release reservation'}
                </button>
              )}
              {(slot.status === 'available' || slot.status === 'reserved' || slot.status === 'unavailable') && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => cancelMut.mutate()}
                  className="w-full rounded-lg border border-red-300 bg-red-50 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  {cancelMut.isPending ? 'Cancelling…' : 'Cancel slot'}
                </button>
              )}
              {(slot.status === 'booked' || slot.status === 'completed' || slot.status === 'cancelled') && (
                <p className="text-center text-xs text-gray-400 py-2">
                  {slot.status === 'booked'    && 'Slot is booked — manage via booking record'}
                  {slot.status === 'completed' && 'Session completed — no actions available'}
                  {slot.status === 'cancelled' && 'Slot cancelled — no actions available'}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400">Select a slot to view details</p>
          </div>
        )}
      </aside>
    </>
  );
}
