'use client';

/**
 * /bookings/[id] — Enhanced booking detail
 *
 * Shows:
 *   - Breadcrumb with back navigation
 *   - Status badge (all 11 statuses)
 *   - Full booking information card
 *   - Payment summary (read-only)
 *   - Booking timeline
 *   - Cancellation policy notice
 *   - Cancel button (when cancellable)
 *   - Reschedule button (when reschedulable)
 *   - QR placeholder
 */

import { useState }                    from 'react';
import { useParams }                   from 'next/navigation';
import Link                            from 'next/link';
import { useQuery, useQueryClient }    from '@tanstack/react-query';
import { cn }                          from '@/lib/utils/cn';
import { useRequireAuth }              from '@/hooks/use-require-auth';
import { BookingStatusBadge }          from '@/components/booking/booking-status-badge';
import { BookingTimeline }             from '@/components/booking/booking-timeline';
import { CancelBookingModal }          from '@/components/booking/cancel-booking-modal';
import { fetchBooking, bookingKeys }   from '@/lib/api/booking.api';
import { QrDisplay }                   from '@/components/qr/qr-display';
import { BookingPricingBreakdown }     from '@/components/pricing/pricing-breakdown';
import {
  formatDate, formatTime, formatPrice,
  BOOKING_STATUS_CONFIG,
  type Booking,
} from '@/types/booking.types';

export default function BookingDetailPage(): React.ReactElement {
  const { id }                       = useParams<{ id: string }>();
  const { isLoading: authLoading }   = useRequireAuth();
  const [showCancel, setShowCancel]  = useState(false);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => fetchBooking(id),
    enabled:  !!id && !authLoading,
    retry:    1,
  });

  if (authLoading || isLoading) {
    return (
      <div className="flex justify-center py-24">
        <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-red-500">Booking not found or you don&apos;t have access to it.</p>
        <Link href="/bookings" className="text-sm font-medium text-blue-600 hover:underline">
          Back to my bookings
        </Link>
      </div>
    );
  }

  const cfg          = BOOKING_STATUS_CONFIG[booking.status];
  const cancellable  = cfg.cancellable;
  const reschedulable = cfg.reschedulable;
  const balance      = (booking.finalPriceMinor ?? 0) - booking.amountPaidMinor;

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400" aria-label="Breadcrumb">
        <Link href="/bookings" className="hover:text-gray-600 transition-colors">My Bookings</Link>
        <span aria-hidden="true">/</span>
        <span className="text-gray-700 font-mono truncate max-w-[160px]">{booking.reference}</span>
      </nav>

      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold text-gray-900 font-mono">{booking.reference}</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Booked {new Date(booking.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Main grid — details + timeline side-by-side on lg */}
      <div className="flex flex-col lg:flex-row gap-4">

        {/* Left column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Schedule card */}
          <InfoCard title="Schedule">
            <InfoRow label="Date"      value={formatDate(booking.startsAt)} />
            <InfoRow label="Time"      value={`${formatTime(booking.startsAt)} – ${formatTime(booking.endsAt)}`} />
            <InfoRow label="Duration"  value={`${booking.totalDurationMins} minutes`} />
            {booking.participantCount > 1 && (
              <InfoRow label="Participants" value={String(booking.participantCount)} />
            )}
            <InfoRow label="Channel"   value={booking.channel.replace(/_/g, ' ')} />
          </InfoCard>

          {/* Payment summary */}
          <InfoCard title="Payment">
            <BookingPricingBreakdown booking={booking} />
          </InfoCard>

          {/* Notes */}
          {(booking.customerNotes || booking.cancellationReason) && (
            <InfoCard title="Notes">
              {booking.customerNotes && (
                <InfoRow label="Your notes" value={booking.customerNotes} />
              )}
              {booking.cancellationReason && (
                <InfoRow label="Cancellation reason" value={booking.cancellationReason} />
              )}
            </InfoCard>
          )}

          {/* Metadata */}
          {booking.metadata && Object.keys(booking.metadata).length > 0 && (
            <InfoCard title="Additional info">
              {Object.entries(booking.metadata).map(([k, v]) => (
                <InfoRow key={k} label={k} value={String(v)} />
              ))}
            </InfoCard>
          )}

          {/* Cancellation policy */}
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <p className="font-semibold mb-1">Cancellation policy</p>
            <p className="text-amber-700 leading-relaxed">
              Cancellations made more than 24 hours before the session start time may be eligible for a
              full refund. Cancellations within 24 hours are subject to the venue&apos;s policy.
              Contact the venue for details.
            </p>
          </div>

          {/* QR check-in */}
          <QrDisplay
            bookingId={booking.id}
            bookingRef={booking.reference}
            bookingStatus={booking.status}
            startsAt={booking.startsAt}
          />
        </div>

        {/* Right column — Timeline */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-700 mb-4">Booking timeline</h3>
            <BookingTimeline booking={booking} />
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {(cancellable || reschedulable) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {reschedulable && (
            <Link
              href={`/bookings/${booking.id}/reschedule`}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              Reschedule
            </Link>
          )}
          {cancellable && (
            <button
              type="button"
              onClick={() => setShowCancel(true)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel booking
            </button>
          )}
        </div>
      )}

      <Link
        href="/bookings"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        ← Back to my bookings
      </Link>

      {/* Cancel modal */}
      {showCancel && (
        <CancelBookingModal
          booking={booking}
          isOpen={showCancel}
          onClose={() => setShowCancel(false)}
          onSuccess={() => setShowCancel(false)}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-xs font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="px-4 py-3 space-y-2.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0 capitalize">{label}</span>
      <span className={cn('text-xs text-right', highlight ? 'font-semibold text-amber-700' : 'text-gray-800')}>
        {value}
      </span>
    </div>
  );
}
