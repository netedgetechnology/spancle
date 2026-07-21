'use client';

/**
 * /bookings/[id]/reschedule
 *
 * Reschedule flow:
 *   1. Shows current booking summary
 *   2. SlotPicker (reuses existing component) for same court
 *   3. BookingSummaryCard (reused) to show new slot selection + confirm
 *   4. Calls PATCH /bookings/:id/reschedule
 *   5. On success → redirects to /bookings/:newId (backend creates a new booking)
 */

import { useState, useCallback }        from 'react';
import { useParams, useRouter }         from 'next/navigation';
import Link                             from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn }                           from '@/lib/utils/cn';
import { useRequireAuth }               from '@/hooks/use-require-auth';
import { SlotPicker }                   from '@/components/booking/slot-picker';
import { BookingStatusBadge }           from '@/components/booking/booking-status-badge';
import { fetchBooking, rescheduleBooking, bookingKeys } from '@/lib/api/booking.api';
import { fetchCourt, courtKeys }        from '@/lib/api/court.api';
import { fetchVenue, venueKeys }        from '@/lib/api/venue.api';
import {
  formatDate, formatTime, formatPrice,
  totalPriceMinor, totalDuration,
  slotPrice,
  BOOKING_STATUS_CONFIG,
  type Slot,
} from '@/types/booking.types';

export default function ReschedulePage(): React.ReactElement {
  const { id }                         = useParams<{ id: string }>();
  const router                         = useRouter();
  const qc                             = useQueryClient();
  const { isLoading: authLoading }     = useRequireAuth();

  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<Slot[]>([]);
  const [reason,       setReason]       = useState('');
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // ── Booking data ──────────────────────────────────────────────────────────

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => fetchBooking(id),
    enabled:  !!id && !authLoading,
  });

  const { data: court } = useQuery({
    queryKey: courtKeys.detail(booking?.courtId ?? ''),
    queryFn:  () => fetchCourt(booking!.courtId),
    enabled:  !!booking?.courtId,
  });

  const { data: venue } = useQuery({
    queryKey: venueKeys.detail(court?.venueId ?? ''),
    queryFn:  () => fetchVenue(court!.venueId),
    enabled:  !!court?.venueId,
  });

  // ── Guard: only reschedulable bookings ───────────────────────────────────

  const isReschedulable = booking ? BOOKING_STATUS_CONFIG[booking.status].reschedulable : false;

  // ── Slot selection ────────────────────────────────────────────────────────

  const handleToggle = useCallback((slot: Slot) => {
    setSelectedIds((prev) => {
      const next = prev.includes(slot.id)
        ? prev.filter((i) => i !== slot.id)
        : [...prev, slot.id];
      return next;
    });
    setSelectedSlots((prev) => {
      const exists = prev.find((s) => s.id === slot.id);
      return exists ? prev.filter((s) => s.id !== slot.id) : [...prev, slot];
    });
  }, []);

  const handleDateChange = useCallback(() => {
    setSelectedIds([]);
    setSelectedSlots([]);
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: () => rescheduleBooking(id, selectedIds, reason.trim() || undefined),
    onSuccess:  (newBooking) => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all() });
      router.push(`/bookings/${newBooking.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message;
      setSubmitError(typeof msg === 'string' ? msg : 'Reschedule failed. Please try again.');
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (authLoading || bookingLoading) {
    return (
      <div className="flex justify-center py-24">
        <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-red-500">Booking not found.</p>
        <Link href="/bookings" className="text-sm font-medium text-blue-600 hover:underline">Back</Link>
      </div>
    );
  }

  if (!isReschedulable) {
    return (
      <div className="max-w-lg mx-auto flex flex-col gap-4 py-12 text-center">
        <p className="text-sm text-gray-600">
          This booking (<span className="font-mono">{booking.reference}</span>) cannot be rescheduled
          in its current status.
        </p>
        <BookingStatusBadge status={booking.status} />
        <Link href={`/bookings/${id}`} className="text-sm font-medium text-blue-600 hover:underline">
          Back to booking
        </Link>
      </div>
    );
  }

  const sortedSelected = [...selectedSlots].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );
  const currency = sortedSelected[0]?.currency ?? booking.currency;
  const newTotal = totalPriceMinor(sortedSelected);

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-gray-400">
        <Link href="/bookings" className="hover:text-gray-600 transition-colors">My Bookings</Link>
        <span>/</span>
        <Link href={`/bookings/${id}`} className="hover:text-gray-600 transition-colors font-mono">{booking.reference}</Link>
        <span>/</span>
        <span className="text-gray-700">Reschedule</span>
      </nav>

      <h1 className="text-lg font-semibold text-gray-900">Reschedule booking</h1>

      {/* Current booking summary */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 mb-0.5">Current booking</p>
          <p className="text-sm font-semibold text-gray-800">{formatDate(booking.startsAt)}</p>
          <p className="text-xs text-gray-500">
            {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
            {' · '}{booking.totalDurationMins} min
          </p>
          {court && <p className="text-xs text-gray-400 mt-0.5">{court.name}</p>}
        </div>
        <BookingStatusBadge status={booking.status} size="sm" />
      </div>

      {/* Main layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Slot picker */}
        <div className="flex-1 min-w-0 rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Choose a new time</h2>
          {booking.courtId && booking.branchId ? (
            <SlotPicker
              courtId={booking.courtId}
              branchId={booking.branchId}
              selectedIds={selectedIds}
              onToggle={handleToggle}
              onDateChange={handleDateChange}
              minDate={new Date().toISOString().slice(0, 10)}
            />
          ) : (
            <p className="text-sm text-red-500">Court information unavailable.</p>
          )}
        </div>

        {/* New booking summary */}
        <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">New booking</h3>
            </div>
            <div className="px-5 py-4 space-y-2.5">
              {venue && <SRow label="Venue"  value={venue.name} />}
              {court && <SRow label="Court"  value={court.name} />}
              {sortedSelected.length > 0 ? (
                <>
                  <SRow label="Date"     value={formatDate(sortedSelected[0]!.startAt)} />
                  <SRow label="Time"     value={`${formatTime(sortedSelected[0]!.startAt)} – ${formatTime(sortedSelected[sortedSelected.length - 1]!.endAt)}`} />
                  <SRow label="Duration" value={`${totalDuration(sortedSelected)} min`} />
                  <div className="border-t border-gray-100 pt-2.5">
                    <div className="flex justify-between">
                      <span className="text-xs font-semibold text-gray-700">New total</span>
                      <span className="text-sm font-bold text-gray-900">{formatPrice(newTotal, currency)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400 italic">Select slots to see new time</p>
              )}
            </div>

            {/* Reason */}
            <div className="px-5 pb-4">
              <label htmlFor="reschedule-reason" className="block text-xs font-medium text-gray-600 mb-1.5">
                Reason (optional)
              </label>
              <textarea
                id="reschedule-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="e.g. Change of plans"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs resize-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {submitError && (
              <div role="alert" className="mx-5 mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {submitError}
              </div>
            )}

            <div className="px-5 pb-5">
              <button
                type="button"
                disabled={selectedIds.length === 0 || mutation.isPending}
                onClick={() => { setSubmitError(null); mutation.mutate(); }}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  selectedIds.length === 0 || mutation.isPending
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700',
                )}
                aria-busy={mutation.isPending}
              >
                {mutation.isPending ? 'Rescheduling…' : 'Confirm reschedule'}
              </button>
            </div>
          </div>

          <Link
            href={`/bookings/${id}`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Keep original
          </Link>
        </div>
      </div>
    </div>
  );
}

function SRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 text-right truncate">{value}</span>
    </div>
  );
}
