'use client';

/**
 * /book/confirmation
 *
 * Handles both flows from a single page:
 *
 * Member:  ?id=<bookingId>               → fetch via GET /bookings/:id (auth)
 * Guest:   ?id=<bookingId>&guest=1
 *            &ref=<reference>
 *            &token=<guestLookupToken>   → display from URL params (no auth needed)
 *            &qr=<qrContent>             → render QR image immediately
 *
 * Components reused:
 *   BookingPricingBreakdown, QrDisplay, BookingStatusBadge
 */

import { useSearchParams } from 'next/navigation';
import Link                from 'next/link';
import { useQuery }        from '@tanstack/react-query';
import { useRequireAuth }             from '@/hooks/use-require-auth';
import { fetchBooking, bookingKeys }  from '@/lib/api/booking.api';
import { BookingPricingBreakdown }    from '@/components/pricing/pricing-breakdown';
import { BookingStatusBadge }         from '@/components/booking/booking-status-badge';
import { QrDisplay }                  from '@/components/qr/qr-display';
import { formatDate, formatTime } from '@/types/booking.types';

export default function BookingConfirmationPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const id            = searchParams.get('id')            ?? '';
  const isGuest       = searchParams.get('guest') === '1';
  const ref           = searchParams.get('ref')             ?? '';
  const lookupToken   = searchParams.get('token')           ?? undefined;
  // stripe_return=1 is set in return_url after 3DS redirect
  const stripeReturn  = searchParams.get('stripe_return')   === '1';
  const piStatus      = searchParams.get('payment_intent_client_secret') ? searchParams.get('redirect_status') : undefined;

  // Member flow: require auth and fetch booking
  const { isLoading: authLoading } = !isGuest ? useRequireAuth() : { isLoading: false };
  const { data: booking, isLoading, error } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => fetchBooking(id),
    enabled:  !!id && !isGuest,
    retry:    2 });

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-sm text-red-500">Invalid confirmation link.</p>
        <Link href="/book" className="mt-3 text-sm font-medium text-blue-600 hover:underline">Book again</Link>
      </div>
    );
  }

  if (!isGuest && (authLoading || isLoading)) {
    return (
      <div className="flex items-center justify-center py-24">
        <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  if (!isGuest && (error || !booking)) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-red-500">Could not load booking details.</p>
        <Link href="/bookings" className="text-sm font-medium text-blue-600 hover:underline">View my bookings</Link>
      </div>
    );
  }

  // ── Post-3DS stripe_return handling ─────────────────────────────────────
  // Stripe redirects back to this URL after 3DS authentication completes.
  // The payment_intent and redirect_status params are appended by Stripe.
  if (stripeReturn && piStatus === 'failed') {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-lg font-semibold text-red-600 mb-2">Payment failed</p>
        <p className="text-sm text-gray-500 mb-6">The payment could not be completed. Your booking is still held.</p>
        <Link href="/book" className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
          Try again
        </Link>
      </div>
    );
  }

  // ── Guest view (data from URL params — no auth) ──────────────────────────

  if (isGuest) {
    return (
      <div className="max-w-lg mx-auto">
        {/* Success banner */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
            <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Booking confirmed!</h1>
          <p className="mt-1 text-sm text-gray-500">
            Check your email for the confirmation and QR code.
          </p>
        </div>

        {/* Reference card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-xs text-gray-400">Booking reference</p>
            <p className="text-lg font-bold font-mono text-gray-900 tracking-wider mt-0.5">
              {ref || id}
            </p>
          </div>

          {/* QR — shown immediately from qrContent passed in URL */}
          <div className="px-5 py-4">
            {id && (
              <QrDisplay
                bookingId={id}
                bookingRef={ref || id}
                bookingStatus="pending_payment"
                startsAt={new Date(Date.now() + 86_400_000).toISOString()}
              />
            )}
          </div>
        </div>

        {/* Account creation CTA */}
        <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
          <p className="text-sm font-semibold text-blue-900 mb-1">Save time next time</p>
          <p className="text-xs text-blue-700 mb-3">
            Create a free account to manage bookings, view history, and check in faster.
          </p>
          <Link
            href={`/register?email=${encodeURIComponent(searchParams.get('email') ?? '')}&callbackUrl=/book/confirmation?id=${id}%26guest=1`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Create an account
          </Link>
          {lookupToken && (
            <p className="mt-2 text-[10px] text-blue-600">
              Your booking will be linked automatically when you register.
            </p>
          )}
        </div>

        {lookupToken && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Need to look up this booking later?{' '}
            <Link href={`/booking-lookup?token=${lookupToken}`} className="font-medium text-blue-600 hover:underline">
              View booking
            </Link>
          </p>
        )}
      </div>
    );
  }

  // ── Member view (booking fetched via auth) ────────────────────────────────

  return (
    <div className="max-w-lg mx-auto">
      {/* Success banner */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Booking confirmed!</h1>
        <p className="mt-1 text-sm text-gray-500">Your booking has been received.</p>
      </div>

      {/* Booking card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-gray-400">Booking reference</p>
              <p className="text-base font-bold text-gray-900 tracking-wider font-mono mt-0.5">
                {booking!.reference}
              </p>
            </div>
            <BookingStatusBadge status={booking!.status} />
          </div>
        </div>

        <div className="px-5 py-4 space-y-2.5">
          <DetailRow label="Date"       value={formatDate(booking!.startsAt)} />
          <DetailRow label="Time"       value={`${formatTime(booking!.startsAt)} – ${formatTime(booking!.endsAt)}`} />
          <DetailRow label="Duration"   value={`${booking!.totalDurationMins} minutes`} />
          <DetailRow label="Booked for" value={booking!.customerName} />

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500 mb-2">Payment</p>
            <BookingPricingBreakdown booking={booking!} />
          </div>
        </div>

        <div className="px-5 pb-5">
          <QrDisplay
            bookingId={booking!.id}
            bookingRef={booking!.reference}
            bookingStatus={booking!.status}
            startsAt={typeof booking!.startsAt === 'string' ? booking!.startsAt : (booking!.startsAt as Date).toISOString()}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <Link href="/bookings"
          className="flex-1 flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          View my bookings
        </Link>
        <Link href="/book"
          className="flex-1 flex items-center justify-center rounded-xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
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
