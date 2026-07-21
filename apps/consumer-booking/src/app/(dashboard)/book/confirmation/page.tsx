'use client';

/**
 * /book/confirmation
 *
 * Shown after a successful booking creation.
 * Reads ?id= from the URL, fetches booking detail, displays:
 *   - booking reference
 *   - status badge
 *   - schedule (venue, date, time, duration)
 *   - QR placeholder (QR token API deferred — shows placeholder)
 *   - link to My Bookings
 */

import { useSearchParams } from 'next/navigation';
import Link                from 'next/link';
import { useQuery }        from '@tanstack/react-query';
import { cn }              from '@/lib/utils/cn';
import { fetchBooking, bookingKeys } from '@/lib/api/booking.api';
import {
  formatDate,
  formatTime,
  formatPrice,
  BOOKING_STATUS_CONFIG,
} from '@/types/booking.types';

export default function BookingConfirmationPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const id           = searchParams.get('id') ?? '';

  const { data: booking, isLoading, error } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => fetchBooking(id),
    enabled:  !!id,
    retry:    2,
  });

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-red-500">Invalid booking link.</p>
        <Link href="/book" className="mt-3 text-sm font-medium text-blue-600 hover:underline">
          Book again
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <p className="text-sm text-red-500">Could not load booking details.</p>
        <Link href="/bookings" className="text-sm font-medium text-blue-600 hover:underline">
          View my bookings
        </Link>
      </div>
    );
  }

  const statusCfg = BOOKING_STATUS_CONFIG[booking.status];

  return (
    <div className="max-w-lg mx-auto">
      {/* Success banner */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Booking confirmed!</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your booking has been received. Check below for details.
        </p>
      </div>

      {/* Booking card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

        {/* Reference header */}
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">Booking reference</p>
              <p className="text-base font-bold text-gray-900 tracking-wider font-mono mt-0.5">
                {booking.reference}
              </p>
            </div>
            {statusCfg && (
              <span className={cn(
                'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
                statusCfg.bg, statusCfg.text,
              )}>
                {statusCfg.label}
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          <DetailRow label="Date"     value={formatDate(booking.startsAt)} />
          <DetailRow
            label="Time"
            value={`${formatTime(booking.startsAt)} – ${formatTime(booking.endsAt)}`}
          />
          <DetailRow label="Duration" value={`${booking.totalDurationMins} minutes`} />
          {booking.finalPriceMinor != null && (
            <DetailRow
              label="Total paid"
              value={formatPrice(booking.finalPriceMinor, booking.currency)}
            />
          )}
          <DetailRow label="Booked for" value={booking.customerName} />
          {booking.customerNotes && (
            <DetailRow label="Notes" value={booking.customerNotes} />
          )}
        </div>

        {/* QR placeholder */}
        <div className="mx-5 mb-5 rounded-xl border-2 border-dashed border-gray-200 p-6 text-center bg-gray-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 mx-auto mb-2">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
          </div>
          <p className="text-xs font-medium text-gray-500">Check-in QR code</p>
          <p className="text-[10px] text-gray-400 mt-1">
            QR token generation coming soon. Show your booking reference at the venue.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link
          href="/bookings"
          className="flex-1 flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View my bookings
        </Link>
        <Link
          href="/book"
          className="flex-1 flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Book another court
        </Link>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 text-right">{value}</span>
    </div>
  );
}
