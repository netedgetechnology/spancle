'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchBookings, cancelBooking, bookingKeys,
} from '@/lib/booking.api';
import { BOOKING_STATUS_CONFIG, type BookingStatus } from '@/types/booking.types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(minor: number | null, currency: string): string {
  if (minor == null) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 0,
  }).format(minor / 100);
}

const STATUS_TABS: Array<{ label: string; filter: BookingStatus | 'upcoming' | 'all' }> = [
  { label: 'All',       filter: 'all'       },
  { label: 'Upcoming',  filter: 'upcoming'  },
  { label: 'Confirmed', filter: 'confirmed' },
  { label: 'Completed', filter: 'completed' },
  { label: 'Cancelled', filter: 'cancelled' },
  { label: 'No Show',   filter: 'no_show'   },
];

export default function BookingsListPage(): React.ReactElement {
  const qc = useQueryClient();
  const [tab,    setTab]    = useState<'all' | 'upcoming' | BookingStatus>('all');
  const [search, setSearch] = useState('');

  const now = new Date();
  const fromParam = tab === 'upcoming'
    ? now.toISOString()
    : tab === 'all'
      ? undefined
      : undefined;
  const statusParam = (tab === 'all' || tab === 'upcoming') ? undefined : tab as BookingStatus;

  const { data: bookings = [], isLoading, error, refetch } = useQuery({
    queryKey: bookingKeys.list({ status: statusParam, from: fromParam, limit: 100 }),
    queryFn:  () => fetchBookings({ status: statusParam, from: fromParam, limit: 100 }),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelBooking(id, reason),
    onSuccess: () => void qc.invalidateQueries({ queryKey: bookingKeys.all() }),
  });

  const handleCancel = (id: string, reference: string) => {
    const reason = window.prompt(`Cancel booking ${reference}?\nReason for cancellation:`);
    if (reason === null) return;
    cancelMut.mutate({ id, reason: reason || 'Cancelled by staff' });
  };

  // Client-side search filter
  const filtered = bookings.filter((b) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.reference.toLowerCase().includes(q) ||
      b.customerName.toLowerCase().includes(q) ||
      (b.customerPhone ?? '').includes(q) ||
      (b.customerEmail ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Bookings</h2>
          <p className="mt-0.5 text-xs text-gray-400">{filtered.length} booking{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/booking"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Booking
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by reference, customer name, mobile…"
          className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button key={t.filter} type="button" onClick={() => setTab(t.filter)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === t.filter
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <PageLoader message="Loading bookings…" />
      ) : error ? (
        <ErrorDisplay title="Failed to load bookings" message={(error as Error).message} retry={() => void refetch()} />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 py-20 text-center">
          <p className="text-sm font-medium text-gray-600">No bookings found</p>
          <p className="text-xs text-gray-400 mt-1">
            {search ? 'Try a different search term' : 'Create a booking to get started'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Reference','Customer','Date & Time','Duration','Price','Status',''].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((booking) => {
                const cfg = BOOKING_STATUS_CONFIG[booking.status];
                const canCancel = booking.status === 'confirmed' || booking.status === 'pending_payment';
                return (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/bookings/${booking.id}`}
                        className="font-mono text-xs font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                        {booking.reference}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{booking.customerName}</p>
                      {booking.customerPhone && (
                        <p className="text-xs text-gray-400">{booking.customerPhone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                      {formatDateTime(booking.startsAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {booking.totalDurationMins} min
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatPrice(booking.finalPriceMinor, booking.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                        cfg.bg, cfg.text, cfg.ring,
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/bookings/${booking.id}`}
                          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                          View
                        </Link>
                        {canCancel && (
                          <button type="button" disabled={cancelMut.isPending}
                            onClick={() => handleCancel(booking.id, booking.reference)}
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors">
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
