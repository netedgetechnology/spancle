'use client';

/**
 * / — Consumer home dashboard
 *
 * Replaces static placeholder with live data:
 *   - Welcome greeting using session name
 *   - Next upcoming booking card
 *   - Booking status summary counts
 *   - Recent bookings list (up to 5)
 *   - Quick Book CTA
 */

import Link                           from 'next/link';
import { useQuery }                   from '@tanstack/react-query';
import { useSession }                 from 'next-auth/react';
import { cn }                         from '@/lib/utils/cn';
import { BookingStatusBadge }         from '@/components/booking/booking-status-badge';
import { fetchMyBookings, bookingKeys } from '@/lib/api/booking.api';
import {
  formatDate, formatTime, formatPrice,
  BOOKING_STATUS_CONFIG,
  type Booking,
} from '@/types/booking.types';

export default function ConsumerHomePage(): React.ReactElement {
  const { data: session } = useSession();
  const userId            = session?.user?.id ?? '';
  const displayName       = session?.user?.name ?? session?.user?.email ?? 'there';
  const firstName         = displayName.split(/[\s@]/)[0] ?? displayName;

  const now = new Date().toISOString();

  // Upcoming bookings
  const { data: upcoming = [], isLoading: upcomingLoading } = useQuery({
    queryKey: bookingKeys.list({ userId, from: now, limit: 5 }),
    queryFn:  () => fetchMyBookings({ userId, from: now, limit: 5 }),
    enabled:  !!userId,
    staleTime: 60_000,
  });

  // Recent (last 5 total — for "recent" section)
  const { data: recent = [], isLoading: recentLoading } = useQuery({
    queryKey: bookingKeys.list({ userId, limit: 5 }),
    queryFn:  () => fetchMyBookings({ userId, limit: 5 }),
    enabled:  !!userId,
    staleTime: 60_000,
  });

  const nextBooking  = upcoming[0] ?? null;
  const otherUpcoming = upcoming.slice(1);

  // Status summary from recent bookings
  const statusCounts = recent.reduce<Partial<Record<string, number>>>((acc, b) => {
    acc[b.status] = (acc[b.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Greeting */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          {greeting()}, {firstName}!
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          {upcoming.length > 0
            ? `You have ${upcoming.length} upcoming booking${upcoming.length !== 1 ? 's' : ''}`
            : 'No upcoming bookings'}
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/book"
          className="flex flex-col items-start gap-2.5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">Book a court</p>
            <p className="text-xs text-gray-400 mt-0.5">Check availability</p>
          </div>
        </Link>

        <Link
          href="/bookings"
          className="flex flex-col items-start gap-2.5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-800">My bookings</p>
            <p className="text-xs text-gray-400 mt-0.5">View history</p>
          </div>
        </Link>
      </div>

      {/* Next booking */}
      <section aria-labelledby="next-booking-heading">
        <h2 id="next-booking-heading" className="text-sm font-semibold text-gray-700 mb-3">Next booking</h2>
        {upcomingLoading ? (
          <div className="h-24 rounded-2xl bg-gray-200 animate-pulse" />
        ) : nextBooking ? (
          <NextBookingCard booking={nextBooking} />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-10 text-center">
            <p className="text-sm text-gray-400">No upcoming bookings</p>
            <Link href="/book" className="text-xs font-medium text-blue-600 hover:underline">
              Book a court →
            </Link>
          </div>
        )}
      </section>

      {/* More upcoming */}
      {otherUpcoming.length > 0 && (
        <section aria-labelledby="upcoming-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="upcoming-heading" className="text-sm font-semibold text-gray-700">Upcoming</h2>
            <Link href="/bookings?tab=upcoming" className="text-xs font-medium text-blue-600 hover:underline">
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {otherUpcoming.map((b) => <BookingMiniCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {/* Status summary */}
      {Object.keys(statusCounts).length > 0 && (
        <section aria-labelledby="status-heading">
          <h2 id="status-heading" className="text-sm font-semibold text-gray-700 mb-3">Recent summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(statusCounts).map(([status, count]) => {
              const cfg = BOOKING_STATUS_CONFIG[status as keyof typeof BOOKING_STATUS_CONFIG];
              if (!cfg) return null;
              return (
                <div key={status} className={cn('rounded-xl px-3 py-2.5', cfg.bg)}>
                  <p className={cn('text-lg font-bold', cfg.text)}>{count}</p>
                  <p className={cn('text-xs', cfg.text, 'opacity-80')}>{cfg.label}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function NextBookingCard({ booking }: { booking: Booking }): React.ReactElement {
  const msUntil = new Date(booking.startsAt).getTime() - Date.now();
  const hoursUntil = Math.max(0, Math.floor(msUntil / (1000 * 60 * 60)));
  const daysUntil  = Math.floor(hoursUntil / 24);

  const countdown = daysUntil > 1
    ? `In ${daysUntil} days`
    : daysUntil === 1
      ? 'Tomorrow'
      : hoursUntil > 0
        ? `In ${hoursUntil}h`
        : 'Starting soon';

  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="block rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-600 bg-blue-100 rounded-full px-2 py-0.5">
              {countdown}
            </span>
            <BookingStatusBadge status={booking.status} size="sm" />
          </div>
          <p className="text-base font-bold text-gray-900">{formatDate(booking.startsAt)}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
          </p>
          <p className="text-xs text-gray-400 mt-1 font-mono">{booking.reference}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-bold text-gray-900">{formatPrice(booking.finalPriceMinor, booking.currency)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{booking.totalDurationMins} min</p>
        </div>
      </div>
    </Link>
  );
}

function BookingMiniCard({ booking }: { booking: Booking }): React.ReactElement {
  return (
    <Link
      href={`/bookings/${booking.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="flex-shrink-0 flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-gray-50 text-gray-700" aria-hidden="true">
        <span className="text-sm font-bold leading-none">{new Date(booking.startsAt).getDate()}</span>
        <span className="text-[9px] font-medium uppercase">
          {new Date(booking.startsAt).toLocaleString('en-GB', { month: 'short' })}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{formatDate(booking.startsAt)}</p>
        <p className="text-[10px] text-gray-400">{formatTime(booking.startsAt)} · {booking.totalDurationMins} min</p>
      </div>
      <BookingStatusBadge status={booking.status} size="sm" />
    </Link>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
