'use client';

/**
 * /bookings — Enhanced consumer booking history
 *
 * Features added over the previous version:
 *   - Auth guard
 *   - Date range filter (from / to)
 *   - Status filter tabs (all 11 statuses)
 *   - Reference search
 *   - Pagination (20 per page)
 *   - Full empty + loading + error states
 */

import { useState }                   from 'react';
import Link                           from 'next/link';
import { useQuery }                   from '@tanstack/react-query';
import { useSession }                 from 'next-auth/react';
import { cn }                         from '@/lib/utils/cn';
import { useRequireAuth }             from '@/hooks/use-require-auth';
import { BookingStatusBadge }         from '@/components/booking/booking-status-badge';
import { fetchMyBookings, bookingKeys } from '@/lib/api/booking.api';
import {
  formatDate, formatTime, formatPrice,
  type BookingStatus,
} from '@/types/booking.types';

// All backend statuses + conveniences
type FilterTab = BookingStatus | 'all' | 'upcoming';

const STATUS_TABS: Array<{ label: string; value: FilterTab }> = [
  { label: 'Upcoming',  value: 'upcoming'        },
  { label: 'All',       value: 'all'             },
  { label: 'Confirmed', value: 'confirmed'        },
  { label: 'Completed', value: 'completed'        },
  { label: 'Cancelled', value: 'cancelled'        },
  { label: 'No Show',   value: 'no_show'          },
  { label: 'Refunded',  value: 'refunded'         },
];

const PAGE_SIZE = 20;

export default function MyBookingsPage(): React.ReactElement {
  const { data: session }            = useSession();
  const { isLoading: authLoading }   = useRequireAuth();
  const userId                       = session?.user?.id ?? '';

  const [activeTab,  setActiveTab]   = useState<FilterTab>('upcoming');
  const [reference,  setReference]   = useState('');
  const [fromDate,   setFromDate]    = useState('');
  const [toDate,     setToDate]      = useState('');
  const [page,       setPage]        = useState(0);

  const params = (() => {
    const now = new Date().toISOString();
    const base: Record<string, string | number | undefined> = {
      userId,
      limit:  PAGE_SIZE,
      offset: page * PAGE_SIZE,
    };
    if (reference.trim()) base['reference'] = reference.trim();
    if (fromDate)         base['from']      = `${fromDate}T00:00:00.000Z`;
    if (toDate)           base['to']        = `${toDate}T23:59:59.999Z`;
    if (activeTab === 'upcoming') { base['from'] = base['from'] ?? now; }
    else if (activeTab !== 'all') base['status'] = activeTab;
    return base;
  })();

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: bookingKeys.list(params),
    queryFn:  () => fetchMyBookings(params),
    enabled:  !!userId && !authLoading,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const hasMore = bookings.length === PAGE_SIZE;

  const resetFilters = () => {
    setReference(''); setFromDate(''); setToDate(''); setPage(0);
  };
  const hasActiveFilters = reference.trim() || fromDate || toDate;

  if (authLoading) {
    return (
      <div className="flex justify-center py-24">
        <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
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
      <div className="flex gap-0.5 border-b border-gray-200 overflow-x-auto -mx-1 px-1" role="tablist">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value} type="button" role="tab"
            aria-selected={activeTab === tab.value}
            onClick={() => { setActiveTab(tab.value); setPage(0); }}
            className={cn(
              'px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap focus:outline-none',
              activeTab === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Reference search */}
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
          <svg className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text" placeholder="Search reference…"
            value={reference} onChange={(e) => { setReference(e.target.value); setPage(0); }}
            className="text-xs bg-transparent outline-none w-36 placeholder-gray-400"
            aria-label="Search by booking reference"
          />
        </div>

        {/* From date */}
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
          <label className="text-xs text-gray-400 flex-shrink-0">From</label>
          <input
            type="date" value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
            className="text-xs bg-transparent outline-none"
            aria-label="From date"
          />
        </div>

        {/* To date */}
        <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm">
          <label className="text-xs text-gray-400 flex-shrink-0">To</label>
          <input
            type="date" value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(0); }}
            className="text-xs bg-transparent outline-none"
            aria-label="To date"
          />
        </div>

        {hasActiveFilters && (
          <button type="button" onClick={resetFilters}
            className="text-xs font-medium text-blue-600 hover:underline px-1">
            Clear filters
          </button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-200" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-red-500">Failed to load bookings.</p>
          <button type="button" onClick={() => void refetch()}
            className="text-sm font-medium text-blue-600 hover:underline">Retry</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-14 text-center rounded-2xl border border-dashed border-gray-200 bg-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-500">{hasActiveFilters ? 'No bookings match your filters' : 'No bookings found'}</p>
            {hasActiveFilters
              ? <button type="button" onClick={resetFilters} className="mt-1 text-xs font-medium text-blue-600 hover:underline">Clear filters</button>
              : <p className="text-xs text-gray-400 mt-0.5">Time to get on the court!</p>}
          </div>
          {!hasActiveFilters && (
            <Link href="/book" className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
              Book a court
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Bookings">
          {bookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/bookings/${booking.id}`}
              role="listitem"
              className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              aria-label={`Booking ${booking.reference}, ${formatDate(booking.startsAt)}`}
            >
              {/* Date block */}
              <div className="flex-shrink-0 flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-blue-50 text-blue-700" aria-hidden="true">
                <span className="text-lg font-bold leading-none">{new Date(booking.startsAt).getDate()}</span>
                <span className="text-[10px] font-medium uppercase">
                  {new Date(booking.startsAt).toLocaleString('en-GB', { month: 'short' })}
                </span>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900 truncate">{formatDate(booking.startsAt)}</span>
                  <BookingStatusBadge status={booking.status} size="sm" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
                  {' · '}{booking.totalDurationMins} min
                </p>
                <p className="text-[10px] font-mono text-gray-400 mt-0.5">{booking.reference}</p>
              </div>

              {/* Price */}
              <div className="flex-shrink-0 text-right">
                <p className="text-sm font-semibold text-gray-900">{formatPrice(booking.finalPriceMinor, booking.currency)}</p>
              </div>

              <svg className="h-4 w-4 flex-shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between">
          <button
            type="button" disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400">Page {page + 1}</span>
          <button
            type="button" disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
