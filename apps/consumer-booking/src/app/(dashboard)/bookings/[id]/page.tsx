'use client';

/**
 * /bookings/[id] — Individual booking detail for consumer
 */

import { useParams } from 'next/navigation';
import Link          from 'next/link';
import { useQuery }  from '@tanstack/react-query';
import { cn }        from '@/lib/utils/cn';
import { fetchBooking, bookingKeys } from '@/lib/api/booking.api';
import {
  formatDate,
  formatTime,
  formatPrice,
  BOOKING_STATUS_CONFIG,
} from '@/types/booking.types';

export default function BookingDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();

  const { data: booking, isLoading, error } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => fetchBooking(id),
    enabled:  !!id,
    retry: 1,
  });

  if (isLoading) {
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
        <p className="text-sm text-red-500">Booking not found.</p>
        <Link href="/bookings" className="text-sm font-medium text-blue-600 hover:underline">
          Back to bookings
        </Link>
      </div>
    );
  }

  const cfg = BOOKING_STATUS_CONFIG[booking.status];

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-400">
        <Link href="/bookings" className="hover:text-gray-600 transition-colors">My Bookings</Link>
        <span>/</span>
        <span className="text-gray-700 font-mono">{booking.reference}</span>
      </nav>

      {/* Status card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">Reference</p>
            <p className="text-base font-bold text-gray-900 font-mono">{booking.reference}</p>
          </div>
          {cfg && (
            <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', cfg.bg, cfg.text)}>
              {cfg.label}
            </span>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          <Row label="Date"     value={formatDate(booking.startsAt)} />
          <Row label="Time"     value={`${formatTime(booking.startsAt)} – ${formatTime(booking.endsAt)}`} />
          <Row label="Duration" value={`${booking.totalDurationMins} minutes`} />
          {booking.participantCount > 1 && (
            <Row label="Participants" value={String(booking.participantCount)} />
          )}
          {booking.finalPriceMinor != null && (
            <Row label="Total" value={formatPrice(booking.finalPriceMinor, booking.currency)} />
          )}
          {booking.customerNotes && (
            <Row label="Notes" value={booking.customerNotes} />
          )}
          {booking.cancellationReason && (
            <Row label="Cancellation reason" value={booking.cancellationReason} />
          )}
        </div>

        {/* QR placeholder */}
        <div className="mx-5 mb-5 flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3">
          <svg className="h-8 w-8 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
          </svg>
          <div>
            <p className="text-xs font-medium text-gray-500">Check-in QR code</p>
            <p className="text-[10px] text-gray-400">Show reference <span className="font-mono">{booking.reference}</span> at the venue</p>
          </div>
        </div>
      </div>

      <Link
        href="/bookings"
        className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        ← Back to my bookings
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 text-right">{value}</span>
    </div>
  );
}
