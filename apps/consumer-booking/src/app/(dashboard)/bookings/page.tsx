'use client';

/**
 * /bookings — Consumer's own booking history
 * Fetches from booking-service GET /api/v1/bookings filtered by userId from session.
 */

import { useState }       from 'react';
import Link               from 'next/link';
import { useQuery }       from '@tanstack/react-query';
import { useSession }     from 'next-auth/react';
import { cn }             from '@/lib/utils/cn';
import { fetchMyBookings, bookingKeys } from '@/lib/api/booking.api';
import {
  formatDate,
  formatTime,
  formatPrice,
  BOOKING_STATUS_CONFIG,
  type BookingStatus,
} from '@/types/booking.types';

const STATUS_TABS: Array<{ label: string; value: BookingStatus | 'all' | 'upcoming' }> = [
  { label: 'All',       value: 'all'        },
  { label: 'Upcoming',  value: 'upcoming'   },
  { label: 'Confirmed', value: 'confirmed'  },
  { label: 'Completed', value: 'completed'  },
  { label: 'Cancelled', value: 'cancelled'  },
];

export default function MyBookingsPage(): React.ReactElement {
  const { data: session } = useSession();
  const userId            = session?.user?.id ?? '';
  const [activeTab, setActiveTab] = useState<string>('upcoming');

  const params = (() => {
    const now = new Date().toISOString();
    if (activeTab === 'all')      return { userId };
    if (activeTab === 'upcoming') return { userId, from: now };
    return { userId, status: activeTab };
  })();

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: bookingKeys.list(params),
    queryFn:  () => fetchMyBookings(params),
    enabled:  !!userId,
    staleTime: 30_000,
  });

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">My Bookings</h1>
          <p className="mt-0.5 text-xs text-gray-400">Your upcoming and past sessions</p>
        </div>
        <Link
          href="/book"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Book
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto -mx-1 px-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap focus:outline-none',
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-gray-200" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-red-500">Failed to load bookings.</p>
          <button type="button" onClick={() => void refetch()}
            className="text-sm font-medium text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      ) : !userId ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-gray-500">Sign in to view your bookings.</p>
          <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">Sign in</Link>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center rounded-2xl border border-dashed border-gray-200 bg-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">No bookings found</p>
            <p className="text-xs text-gray-400 mt-0.5">Time to get on the court!</p>
          </div>
          <Link
            href="/book"
            className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Book a court
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const cfg = BOOKING_STATUS_CONFIG[booking.status];
            return (
              <Link
                key={booking.id}
                href={`/bookings/${booking.id}`}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                {/* Date block */}
                <div className="flex-shrink-0 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <span className="text-lg font-bold leading-none">
                    {new Date(booking.startsAt).getDate()}
                  </span>
                  <span className="text-[10px] font-medium uppercase">
                    {new Date(booking.startsAt).toLocaleString('en-GB', { month: 'short' })}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {formatDate(booking.startsAt)}
                    </span>
                    {cfg && (
                      <span className={cn('flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium', cfg.bg, cfg.text)}>
                        {cfg.label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
                    {' · '}
                    {booking.totalDurationMins} min
                  </p>
                  <p className="text-[10px] font-mono text-gray-400 mt-0.5">{booking.reference}</p>
                </div>

                {/* Price */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatPrice(booking.finalPriceMinor, booking.currency)}
                  </p>
                </div>

                <svg className="h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
