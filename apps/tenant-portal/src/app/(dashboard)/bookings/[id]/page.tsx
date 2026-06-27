'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { PageLoader }   from '@/components/ui/page-loader';
import { ErrorDisplay } from '@/components/ui/error-display';
import {
  fetchBooking, cancelBooking, bookingKeys,
} from '@/lib/booking.api';
import { BOOKING_STATUS_CONFIG } from '@/types/booking.types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatPrice(minor: number | null, currency: string): string {
  if (minor == null) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(minor / 100);
}

function Field({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <div className="text-sm text-gray-900">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">{children}</div>
    </div>
  );
}

export default function BookingDetailPage(): React.ReactElement {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelReason,  setCancelReason]  = useState('');

  const { data: booking, isLoading, error, refetch } = useQuery({
    queryKey: bookingKeys.detail(id),
    queryFn:  () => fetchBooking(id),
    enabled:  !!id,
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelBooking(id, cancelReason || 'Cancelled by staff'),
    onSuccess:  () => {
      void qc.invalidateQueries({ queryKey: bookingKeys.all() });
      setCancelConfirm(false);
    },
  });

  if (isLoading) return <PageLoader message="Loading booking…" />;
  if (error || !booking) return (
    <ErrorDisplay
      title="Booking not found"
      message={(error as Error)?.message ?? ''}
      retry={() => void refetch()}
    />
  );

  const cfg       = BOOKING_STATUS_CONFIG[booking.status];
  const canCancel = booking.status === 'confirmed' || booking.status === 'pending_payment';

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <Link href="/bookings" className="hover:text-gray-600 transition-colors">Bookings</Link>
          <span>/</span>
          <span className="text-gray-600 font-mono font-medium">{booking.reference}</span>
        </nav>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900 font-mono">{booking.reference}</h2>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
            cfg.bg, cfg.text, cfg.ring,
          )}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Booking details */}
      <Section title="Booking">
        <Field label="Court">{booking.courtId.slice(0, 8)}…</Field>
        <Field label="Starts">{formatDateTime(booking.startsAt)}</Field>
        <Field label="Ends">{formatDateTime(booking.endsAt)}</Field>
        <Field label="Duration">{booking.totalDurationMins} minutes</Field>
        <Field label="Slots booked">{booking.slotIds.length}</Field>
        <Field label="Channel"><span className="capitalize">{booking.channel.replace('_', ' ')}</span></Field>
      </Section>

      {/* Customer */}
      <Section title="Customer">
        <Field label="Name">{booking.customerName}</Field>
        <Field label="Mobile">{booking.customerPhone ?? '—'}</Field>
        <Field label="Email">{booking.customerEmail || '—'}</Field>
        <Field label="Member">{booking.isMember ? 'Yes' : 'No'}</Field>
        <Field label="Participants">{booking.participantCount}</Field>
        {booking.customerNotes && (
          <div className="col-span-3">
            <Field label="Notes">{booking.customerNotes}</Field>
          </div>
        )}
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        <Field label="Total price">{formatPrice(booking.finalPriceMinor, booking.currency)}</Field>
        <Field label="Amount paid">{formatPrice(booking.amountPaidMinor, booking.currency)}</Field>
        <Field label="Refunded">{formatPrice(booking.amountRefundedMinor, booking.currency)}</Field>
        <Field label="Currency">{booking.currency}</Field>
        {booking.finalPriceMinor !== null && (
          <Field label="Balance due">
            {formatPrice(
              booking.finalPriceMinor - booking.amountPaidMinor + booking.amountRefundedMinor,
              booking.currency,
            )}
          </Field>
        )}
      </Section>

      {/* Audit */}
      <Section title="Audit">
        <Field label="Created">{formatDateTime(booking.createdAt)}</Field>
        <Field label="Last updated">{formatDateTime(booking.updatedAt)}</Field>
        {booking.cancelledAt && <Field label="Cancelled">{formatDateTime(booking.cancelledAt)}</Field>}
        {booking.cancellationReason && (
          <div className="col-span-3">
            <Field label="Cancellation reason">{booking.cancellationReason}</Field>
          </div>
        )}
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Back
        </button>

        {/* Print placeholder */}
        <button type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
          Print
        </button>

        {canCancel && !cancelConfirm && (
          <button type="button"
            onClick={() => setCancelConfirm(true)}
            className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            Cancel Booking
          </button>
        )}
      </div>

      {/* Cancel confirmation */}
      {cancelConfirm && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col gap-4">
          <p className="text-sm font-semibold text-red-800">Cancel this booking?</p>
          <p className="text-xs text-red-700">
            This will release all {booking.slotIds.length} slot{booking.slotIds.length !== 1 ? 's' : ''} back to available.
            This action cannot be undone.
          </p>
          <div>
            <label className="block text-xs font-medium text-red-700 mb-1.5">Reason (optional)</label>
            <input type="text" value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation…"
              className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100 bg-white" />
          </div>
          {cancelMut.isError && (
            <p className="text-xs text-red-700">
              {(cancelMut.error as Error).message ?? 'Cancellation failed. Please try again.'}
            </p>
          )}
          <div className="flex gap-3">
            <button type="button" disabled={cancelMut.isPending}
              onClick={() => cancelMut.mutate()}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors">
              {cancelMut.isPending && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {cancelMut.isPending ? 'Cancelling…' : 'Confirm Cancellation'}
            </button>
            <button type="button" onClick={() => setCancelConfirm(false)}
              className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Keep Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
