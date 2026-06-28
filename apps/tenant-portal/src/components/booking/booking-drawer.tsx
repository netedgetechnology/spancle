'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }                                    from '@/lib/utils/cn';
import { fetchBooking, cancelBooking, bookingKeys } from '@/lib/booking.api';
import { BookingStatusBadge }                  from './booking-status-badge';

interface BookingDrawerProps {
  bookingId: string | null;
  onClose:   () => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs font-medium text-gray-500 flex-shrink-0 w-28">{label}</span>
      <span className="text-xs text-gray-900 text-right">{value}</span>
    </div>
  );
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtPrice(minor: number | null, currency: string): string {
  if (minor == null) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function BookingDrawer({ bookingId, onClose }: BookingDrawerProps): React.ReactElement {
  const qc = useQueryClient();
  const isOpen = !!bookingId;

  const { data: booking, isLoading } = useQuery({
    queryKey: bookingKeys.detail(bookingId ?? ''),
    queryFn:  () => fetchBooking(bookingId!),
    enabled:  !!bookingId,
  });

  const cancelMut = useMutation({
    mutationFn: (reason: string) => cancelBooking(bookingId!, reason),
    onSuccess:  () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all() });
    },
  });

  const handleCancel = () => {
    const reason = window.prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user pressed cancel
    cancelMut.mutate(reason || 'Cancelled by staff');
  };

  const canCancel = booking &&
    (booking.status === 'confirmed' || booking.status === 'pending_payment');

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div className={cn(
        'fixed top-0 right-0 h-full w-[380px] bg-white shadow-2xl z-40 flex flex-col transition-transform duration-200',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Booking Details</h3>
          <button type="button" onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex items-center justify-center h-40">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          )}

          {booking && (
            <div className="flex flex-col gap-5">
              {/* Status + reference */}
              <div className="flex items-center gap-3">
                <BookingStatusBadge status={booking.status} />
                <span className="font-mono text-sm font-semibold text-gray-700">
                  {booking.reference}
                </span>
              </div>

              {/* Customer */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Customer</p>
                <Row label="Name"   value={booking.customerName} />
                <Row label="Mobile" value={booking.customerPhone ?? '—'} />
                <Row label="Email"  value={booking.customerEmail || '—'} />
                <Row label="Member" value={booking.isMember ? 'Yes' : 'No'} />
              </div>

              {/* Booking */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Booking</p>
                <Row label="Starts"    value={fmt(booking.startsAt)} />
                <Row label="Ends"      value={fmt(booking.endsAt)} />
                <Row label="Duration"  value={`${booking.totalDurationMins} min`} />
                <Row label="Slots"     value={booking.slotIds.length} />
                <Row label="Channel"   value={<span className="capitalize">{booking.channel.replace('_', ' ')}</span>} />
              </div>

              {/* Pricing */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="text-xs font-semibold text-gray-600 mb-2">Pricing</p>
                <Row label="Total"     value={fmtPrice(booking.finalPriceMinor, booking.currency)} />
                <Row label="Paid"      value={fmtPrice(booking.amountPaidMinor, booking.currency)} />
                <Row label="Refunded"  value={fmtPrice(booking.amountRefundedMinor, booking.currency)} />
              </div>

              {/* Notes */}
              {(booking.customerNotes || booking.internalNotes) && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Notes</p>
                  {booking.customerNotes && (
                    <p className="text-xs text-gray-700">{booking.customerNotes}</p>
                  )}
                  {booking.internalNotes && (
                    <p className="text-xs text-gray-500 mt-1 italic">{booking.internalNotes}</p>
                  )}
                </div>
              )}

              {/* Cancellation info */}
              {booking.cancellationReason && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-xs font-semibold text-red-700 mb-1">Cancelled</p>
                  <p className="text-xs text-red-600">{booking.cancellationReason}</p>
                  {booking.cancelledAt && (
                    <p className="text-[10px] text-red-400 mt-1">{fmt(booking.cancelledAt)}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {booking && (
          <div className="flex-shrink-0 border-t border-gray-200 px-5 py-4 flex gap-3">
            {canCancel && (
              <button type="button" disabled={cancelMut.isPending}
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                {cancelMut.isPending ? 'Cancelling…' : 'Cancel Booking'}
              </button>
            )}
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Close
            </button>
          </div>
        )}
      </div>
    </>
  );
}
