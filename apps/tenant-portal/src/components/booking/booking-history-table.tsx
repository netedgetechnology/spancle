'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { BookingStatusBadge } from './booking-status-badge';
import {
  cancelBooking,
  confirmBooking,
  checkInBooking,
  markNoShow,
  bookingKeys,
} from '@/lib/booking.api';
import {
  formatBookingPrice,
  formatBookingTime,
  balanceDue,
  type Booking,
  type BookingStatus,
} from '@/types/booking.types';

interface BookingHistoryTableProps {
  bookings:    Booking[];
  isLoading?:  boolean;
  error?:      Error | null;
  onRetry?:    () => void;
  onSelect?:   (booking: Booking) => void;
}

const STATUS_FILTERS: { label: string; value: BookingStatus | '' }[] = [
  { label: 'All',             value: ''                },
  { label: 'Pending',         value: 'pending_payment' },
  { label: 'Confirmed',       value: 'confirmed'       },
  { label: 'Completed',       value: 'completed'       },
  { label: 'Cancelled',       value: 'cancelled'       },
  { label: 'No Show',         value: 'no_show'         },
  { label: 'Refunded',        value: 'refunded'        },
];

/**
 * BookingHistoryTable — paginated, filterable table of bookings.
 * Action buttons are context-sensitive based on booking status.
 */
export function BookingHistoryTable({
  bookings,
  isLoading = false,
  error     = null,
  onRetry,
  onSelect,
}: BookingHistoryTableProps): React.ReactElement {
  const queryClient  = useQueryClient();
  const [filter, setFilter]           = useState<BookingStatus | ''>('');
  const [cancelId, setCancelId]       = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [busyId, setBusyId]           = useState<string | null>(null);

  const invalidate = (): void => {
    void queryClient.invalidateQueries({ queryKey: bookingKeys.all() });
  };

  const confirmMut = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return confirmBooking(id); },
    onSettled:  () => { setBusyId(null); invalidate(); },
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelBooking(id, reason),
    onSuccess: () => { setCancelId(null); setCancelReason(''); invalidate(); },
    onSettled: () => setBusyId(null),
  });

  const checkInMut = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return checkInBooking(id); },
    onSettled:  () => { setBusyId(null); invalidate(); },
  });

  const noShowMut = useMutation({
    mutationFn: (id: string) => { setBusyId(id); return markNoShow(id); },
    onSettled:  () => { setBusyId(null); invalidate(); },
  });

  const visible = filter ? bookings.filter((b) => b.status === filter) : bookings;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-100 animate-pulse">
          <div className="h-4 w-40 rounded bg-gray-200" />
        </div>
        <div className="divide-y divide-gray-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
              <div className="h-4 w-28 rounded bg-gray-100" />
              <div className="h-4 flex-1 rounded bg-gray-100" />
              <div className="h-6 w-20 rounded-full bg-gray-100" />
              <div className="h-4 w-16 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm font-medium text-red-800">Failed to load bookings</p>
        {onRetry && (
          <button type="button" onClick={onRetry}
            className="mt-2 text-xs text-red-600 underline hover:no-underline">
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Cancel reason modal */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" role="dialog" aria-modal>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-900">Cancel booking</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason…"
                className="block w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button type="button"
                onClick={() => { setCancelId(null); setCancelReason(''); }}
                disabled={cancelMut.isPending}
                className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                Back
              </button>
              <button type="button"
                disabled={!cancelReason.trim() || cancelMut.isPending}
                onClick={() => cancelMut.mutate({ id: cancelId, reason: cancelReason })}
                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {cancelMut.isPending ? 'Cancelling…' : 'Confirm cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        {/* Header + filter tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">
            Bookings
            <span className="ml-2 text-xs font-normal text-gray-400">
              {visible.length} result{visible.length !== 1 ? 's' : ''}
            </span>
          </p>
          <div className="flex items-center gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
                  filter === f.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {visible.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No bookings match the selected filter</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reference</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((booking) => {
                  const isBusy   = busyId === booking.id;
                  const balance  = balanceDue(booking);

                  return (
                    <tr
                      key={booking.id}
                      className={cn(
                        'hover:bg-gray-50/60 transition-colors',
                        onSelect && 'cursor-pointer',
                      )}
                      onClick={() => onSelect?.(booking)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold text-gray-700">{booking.reference}</p>
                        <p className="text-[10px] text-gray-400 capitalize mt-0.5">{booking.channel.replace(/_/g, ' ')}</p>
                      </td>

                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800 truncate max-w-[140px]">{booking.customerName}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[140px]">{booking.customerEmail}</p>
                        {booking.isMember && (
                          <span className="inline-block mt-0.5 rounded-full bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-700">Member</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 whitespace-nowrap">
                          {formatBookingTime(booking)}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <BookingStatusBadge status={booking.status} size="xs" />
                        {booking.checkedInAt && (
                          <p className="text-[10px] text-emerald-600 mt-0.5">✓ Checked in</p>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold text-gray-800">{formatBookingPrice(booking)}</p>
                        {balance > 0 && (
                          <p className="text-[10px] text-amber-600 font-medium">
                            {new Intl.NumberFormat('en-GB', { style: 'currency', currency: booking.currency, minimumFractionDigits: 0 }).format(balance / 100)} due
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                          {booking.status === 'pending_payment' && (
                            <ActionBtn
                              label="Confirm"
                              busy={isBusy}
                              color="emerald"
                              onClick={() => confirmMut.mutate(booking.id)}
                            />
                          )}
                          {booking.status === 'confirmed' && !booking.checkedInAt && (
                            <ActionBtn
                              label="Check in"
                              busy={isBusy}
                              color="blue"
                              onClick={() => checkInMut.mutate(booking.id)}
                            />
                          )}
                          {booking.status === 'confirmed' && (
                            <ActionBtn
                              label="No show"
                              busy={isBusy}
                              color="amber"
                              onClick={() => noShowMut.mutate(booking.id)}
                            />
                          )}
                          {(booking.status === 'pending_payment' || booking.status === 'confirmed') && (
                            <ActionBtn
                              label="Cancel"
                              busy={isBusy}
                              color="red"
                              onClick={() => setCancelId(booking.id)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function ActionBtn({
  label, busy, color, onClick,
}: {
  label:   string;
  busy:    boolean;
  color:   'emerald' | 'blue' | 'amber' | 'red';
  onClick: () => void;
}): React.ReactElement {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200',
    blue:    'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    amber:   'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    red:     'bg-red-50 text-red-700 hover:bg-red-100 border-red-200',
  };
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={cn(
        'rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40 whitespace-nowrap',
        colors[color],
      )}
    >
      {label}
    </button>
  );
}
