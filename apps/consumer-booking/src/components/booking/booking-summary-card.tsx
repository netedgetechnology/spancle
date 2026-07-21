'use client';

import { cn }                from '@/lib/utils/cn';
import {
  formatDate,
  formatTime,
  formatPrice,
  slotPrice,
  totalPriceMinor,
  totalDuration,
  type Slot,
  type Venue,
  type Court,
}                             from '@/types/booking.types';

interface BookingSummaryCardProps {
  venue:        Venue | null;
  court:        Court | null;
  date:         string;
  slots:        Slot[];
  onSubmit:     () => void;
  isSubmitting: boolean;
  submitError:  string | null;
  className?:   string;
}

/**
 * BookingSummaryCard — shows the booking summary before submission.
 *
 * Pricing comes from backend slot data (resolvedPriceMinor / priceOverrideMinor).
 * No frontend price calculations beyond formatting.
 */
export function BookingSummaryCard({
  venue,
  court,
  date,
  slots,
  onSubmit,
  isSubmitting,
  submitError,
  className,
}: BookingSummaryCardProps): React.ReactElement {
  const total    = totalPriceMinor(slots);
  const duration = totalDuration(slots);
  const currency = slots[0]?.currency ?? 'GBP';

  const startsAt = slots.length > 0 ? slots[0]!.startAt : null;
  const endsAt   = slots.length > 0 ? slots[slots.length - 1]!.endAt : null;

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden', className)}>
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Booking summary</h3>
      </div>

      <div className="px-5 py-4 space-y-3">
        {/* Venue */}
        <SummaryRow label="Venue" value={venue?.name ?? '—'} />

        {/* Court */}
        <SummaryRow
          label="Court"
          value={court ? `${court.name}${court.courtType ? ` (${court.courtType})` : ''}` : '—'}
        />

        {/* Date */}
        <SummaryRow label="Date" value={date ? formatDate(`${date}T12:00:00Z`) : '—'} />

        {/* Time */}
        {startsAt && endsAt && (
          <SummaryRow
            label="Time"
            value={`${formatTime(startsAt)} – ${formatTime(endsAt)}`}
          />
        )}

        {/* Duration */}
        <SummaryRow
          label="Duration"
          value={duration > 0 ? `${duration} min${duration !== 1 ? 's' : ''}` : '—'}
        />

        {/* Slots breakdown */}
        {slots.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">
              Slots ({slots.length})
            </p>
            <div className="space-y-1 pl-1">
              {slots.map((s) => {
                const p = slotPrice(s);
                return (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">
                      {formatTime(s.startAt)} – {formatTime(s.endAt)}
                    </span>
                    <span className="font-medium text-gray-700">
                      {p != null ? formatPrice(p, s.currency) : 'Free'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-base font-bold text-gray-900">
              {slots.length === 0 ? '—' : formatPrice(total, currency)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            Pricing calculated by server. Final amount confirmed at checkout.
          </p>
        </div>
      </div>

      {/* Error */}
      {submitError && (
        <div role="alert" className="mx-5 mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <div className="px-5 pb-5">
        <button
          type="button"
          disabled={slots.length === 0 || isSubmitting}
          onClick={onSubmit}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            slots.length === 0 || isSubmitting
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
          aria-busy={isSubmitting}
        >
          {isSubmitting && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isSubmitting ? 'Submitting…' : 'Confirm booking'}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 text-right">{value}</span>
    </div>
  );
}
