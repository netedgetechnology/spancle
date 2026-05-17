'use client';

/**
 * Customer-facing booking page.
 * Route: /booking
 *
 * Accessible at:
 *   https://tenantname.spancle.com/booking
 *   https://tenantdomain.com/booking
 *
 * This page serves both tenant staff (manual booking) and
 * customers (self-service booking). Role-based UI is determined
 * by the session token role.
 *
 * Full booking flow will be implemented in Sprint 5.
 */
export default function BookingPage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Book a Court</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select a sport, date and time to make a booking.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-16 text-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
          <svg className="h-7 w-7 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Booking engine coming soon</p>
          <p className="mt-1 text-xs text-gray-400">
            Full booking flow with court selection, time slots and payment is coming in the next release.
          </p>
        </div>
      </div>
    </div>
  );
}
