import Link from 'next/link';

export default function ConsumerHomePage(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Welcome back</h2>
        <p className="text-xs text-gray-400 mt-0.5">Ready to play?</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/book"
          className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Book a court</p>
            <p className="text-xs text-gray-400 mt-0.5">Check availability and reserve a slot</p>
          </div>
        </Link>

        <Link
          href="/bookings"
          className="flex flex-col items-start gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">My bookings</p>
            <p className="text-xs text-gray-400 mt-0.5">View upcoming and past bookings</p>
          </div>
        </Link>
      </div>

      {/* Upcoming bookings placeholder */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Upcoming bookings</h3>
        <div className="rounded-lg border border-dashed border-gray-200 p-8 text-center">
          <p className="text-xs text-gray-400">No upcoming bookings</p>
          <Link href="/book" className="mt-3 inline-block text-xs font-medium text-blue-600 hover:underline">
            Book a court →
          </Link>
        </div>
      </div>
    </div>
  );
}
