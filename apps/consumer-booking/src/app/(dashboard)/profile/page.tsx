'use client';

/**
 * /profile — Member profile page
 *
 * Shows:
 *   - Account info from session
 *   - Booking statistics (from last 90 days)
 *   - Membership summary card
 *   - Quick links
 */

import { useSession, signOut }         from 'next-auth/react';
import Link                            from 'next/link';
import { useQuery }                    from '@tanstack/react-query';
import { useRequireAuth }              from '@/hooks/use-require-auth';
import { fetchMyBookings, bookingKeys } from '@/lib/api/booking.api';
import { BookingStatusBadge }          from '@/components/booking/booking-status-badge';
import { formatDate, formatTime, formatPrice } from '@/types/booking.types';

function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function Avatar({ name }: { name: string }): React.ReactElement {
  const initials = name
    .split(/[\s@]/)
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-xl font-bold shadow-md" aria-hidden="true">
      {initials || '?'}
    </div>
  );
}

function StatBox({ label, value, color = 'text-gray-900' }: { label: string; value: string | number; color?: string }): React.ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

export default function ProfilePage(): React.ReactElement {
  const { data: session }  = useSession();
  const { isLoading: authLoading } = useRequireAuth();
  const user = session?.user;

  const from90 = nDaysAgo(90);

  const { data: recentBookings = [], isLoading: bLoading } = useQuery({
    queryKey: bookingKeys.list({ userId: user?.id ?? '', from: from90, limit: 100 }),
    queryFn:  () => fetchMyBookings({ userId: user?.id, from: from90, limit: 100 }),
    enabled:  !!user?.id && !authLoading,
    staleTime: 60_000,
  });

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  const displayName = user?.name ?? user?.email ?? 'Member';
  const email       = user?.email ?? '';

  const confirmed  = recentBookings.filter((b) => ['confirmed', 'in_progress', 'checked_in'].includes(b.status)).length;
  const completed  = recentBookings.filter((b) => b.status === 'completed').length;
  const totalSpend = recentBookings.reduce((s, b) => s + (b.finalPriceMinor ?? 0), 0);
  const currency   = recentBookings[0]?.currency ?? 'INR';

  // Upcoming (next 5)
  const now = new Date().toISOString();
  const upcoming = recentBookings
    .filter((b) => b.startsAt > now && ['reserved', 'confirmed', 'pending_payment'].includes(b.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      {/* Profile card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-6 flex items-center gap-4 border-b border-gray-100">
          <Avatar name={displayName} />
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{displayName}</h2>
            <p className="text-sm text-gray-400 truncate">{email}</p>
            {(user as { isMember?: boolean })?.isMember && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                ✓ Member
              </span>
            )}
          </div>
        </div>

        <div className="px-6 py-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Email</span>
            <span className="font-medium text-gray-900 truncate max-w-[220px]">{email}</span>
          </div>
          {user?.id && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Member ID</span>
              <span className="font-mono text-xs text-gray-400 truncate max-w-[220px]">{user.id.slice(0, 8)}…</span>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => void signOut({ callbackUrl: '/login' })}
            className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* 90-day stats */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Last 90 days</h3>
        {bLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Total bookings" value={recentBookings.length} color="text-blue-600" />
            <StatBox label="Confirmed"       value={confirmed}            color="text-emerald-600" />
            <StatBox label="Completed"       value={completed}            color="text-gray-700" />
            <StatBox label="Spent"           value={formatPrice(totalSpend, currency)} color="text-purple-600" />
          </div>
        )}
      </div>

      {/* Upcoming bookings */}
      {upcoming.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Upcoming</h3>
            <Link href="/bookings" className="text-xs font-medium text-blue-600 hover:underline">See all</Link>
          </div>
          <div className="flex flex-col gap-2">
            {upcoming.map((b) => (
              <Link
                key={b.id}
                href={`/bookings/${b.id}`}
                className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="flex-shrink-0 flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <span className="text-sm font-bold leading-none">{new Date(b.startsAt).getDate()}</span>
                  <span className="text-[9px] font-medium uppercase">
                    {new Date(b.startsAt).toLocaleString('en-GB', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800">{formatDate(b.startsAt)}</p>
                  <p className="text-[10px] text-gray-400">{formatTime(b.startsAt)} · {b.totalDurationMins} min</p>
                </div>
                <BookingStatusBadge status={b.status} size="sm" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick links</h3>
        <div className="flex flex-col gap-2">
          {[
            { href: '/book',          label: 'Book a court',      desc: 'Find and book available slots' },
            { href: '/bookings',      label: 'Booking history',   desc: 'View all your past bookings' },
            { href: '/booking-lookup',label: 'Guest booking',     desc: 'Look up a guest booking by token' },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-blue-200 hover:bg-blue-50/50 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{label}</p>
                <p className="text-xs text-gray-400">{desc}</p>
              </div>
              <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
