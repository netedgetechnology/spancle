'use client';

/**
 * /booking-lookup — Guest booking lookup via signed email-link token
 *
 * Reads ?token= from the query string and calls
 * GET /api/v1/guest/lookup/:token (booking-service @Public endpoint).
 *
 * Returns a read-only view of the booking — no cancel/reschedule for guests.
 * Reuses: BookingStatusBadge, QrDisplay (with qrContent from URL if present)
 */

import { useSearchParams } from 'next/navigation';
import Link                from 'next/link';
import { useQuery }        from '@tanstack/react-query';
import { BookingStatusBadge } from '@/components/booking/booking-status-badge';
import { QrDisplay }          from '@/components/qr/qr-display';
import { fetchGuestBooking, guestLookupKeys } from '@/lib/api/guest.api';
import { formatDate, formatTime, formatPrice } from '@/types/booking.types';
import type { BookingStatus } from '@/types/booking.types';

export default function BookingLookupPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const token    = searchParams.get('token') ?? '';

  const { data, isLoading, error } = useQuery({
    queryKey: guestLookupKeys.byToken(token),
    queryFn:  () => fetchGuestBooking(token),
    enabled:  !!token,
    retry:    1,
    staleTime: 5 * 60_000,
  });

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-sm text-red-500">Invalid booking link.</p>
        <Link href="/book" className="text-sm font-medium text-blue-600 hover:underline">Book a court</Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  if (error || !data) {
    const status = (error as { statusCode?: number })?.statusCode;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center max-w-sm mx-auto">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
          <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">
            {status === 401 ? 'Link expired' : 'Booking not found'}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {status === 401
              ? 'This booking link has expired. Links are valid for 7 days.'
              : 'We could not find your booking. Please check the link.'}
          </p>
        </div>
        <Link href="/book" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          Book a court
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold text-blue-600">Spancle</span>
          <h1 className="mt-4 text-lg font-semibold text-gray-900">Your booking</h1>
        </div>

        {/* Booking card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">Reference</p>
                <p className="text-base font-bold font-mono text-gray-900 mt-0.5">{data.reference}</p>
              </div>
              <BookingStatusBadge status={data.status as BookingStatus} />
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            <Row label="Date"     value={formatDate(data.startsAt)} />
            <Row label="Time"     value={`${formatTime(data.startsAt)} – ${formatTime(data.endsAt)}`} />
            <Row label="Duration" value={`${data.totalDurationMins} minutes`} />
            <Row label="Name"     value={data.customerName} />
            {data.finalPriceMinor != null && (
              <Row label="Total" value={formatPrice(data.finalPriceMinor, data.currency)} />
            )}
          </div>

          {/* QR — uses qrContent from URL if available, or shows instructions */}
          <div className="px-5 pb-5">
            <QrDisplay
              bookingId={data.id}
              bookingRef={data.reference}
              bookingStatus={data.status as BookingStatus}
              startsAt={data.startsAt}
            />
          </div>
        </div>

        {/* Account CTA */}
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Manage your bookings</p>
          <p className="text-xs text-blue-700 mb-3">
            Create an account to cancel, reschedule, and view all your bookings in one place.
          </p>
          <Link
            href={`/register?callbackUrl=/booking-lookup?token=${encodeURIComponent(token)}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Create a free account
          </Link>
          <span className="ml-3 text-xs text-blue-600">
            or <Link href="/login" className="underline">sign in</Link>
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 text-right">{value}</span>
    </div>
  );
}
