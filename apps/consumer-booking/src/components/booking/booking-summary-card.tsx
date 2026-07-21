'use client';

/**
 * booking-summary-card.tsx
 *
 * Pre-submission summary used in the booking wizard.
 * Delegates ALL pricing display to SlotPricingBreakdown (from pricing-breakdown.tsx).
 * No price calculations here — backend is the single pricing authority.
 */

import { cn }                        from '@/lib/utils/cn';
import { SlotPricingBreakdown, CouponField } from '@/components/pricing/pricing-breakdown';
import { formatDate, formatTime, type Slot, type Venue, type Court } from '@/types/booking.types';

interface BookingSummaryCardProps {
  venue:        Venue | null;
  court:        Court | null;
  date:         string;
  slots:        Slot[];
  isMember?:    boolean;
  onSubmit:     () => void;
  isSubmitting: boolean;
  submitError:  string | null;
  className?:   string;
}

export function BookingSummaryCard({
  venue,
  court,
  date,
  slots,
  isMember,
  onSubmit,
  isSubmitting,
  submitError,
  className,
}: BookingSummaryCardProps): React.ReactElement {
  const startsAt = slots[0]?.startAt ?? null;
  const endsAt   = slots[slots.length - 1]?.endAt ?? null;
  const duration = slots.reduce((s, sl) => s + sl.durationMins, 0);

  return (
    <div className={cn('rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden', className)}>
      {/* Header */}
      <div className="border-b border-gray-100 px-5 py-4">
        <h3 className="text-sm font-semibold text-gray-900">Booking summary</h3>
      </div>

      {/* Schedule */}
      <div className="px-5 py-4 space-y-2 border-b border-gray-100">
        {venue  && <SRow label="Venue"    value={venue.name} />}
        {court  && <SRow label="Court"    value={`${court.name}${court.courtType ? ` (${court.courtType})` : ''}`} />}
        {date   && <SRow label="Date"     value={formatDate(`${date}T12:00:00Z`)} />}
        {startsAt && endsAt && (
          <SRow label="Time" value={`${formatTime(startsAt)} – ${formatTime(endsAt)}`} />
        )}
        {duration > 0 && (
          <SRow label="Duration" value={`${duration} min`} />
        )}
        {slots.length > 0 && (
          <SRow label="Slots" value={`${slots.length} slot${slots.length !== 1 ? 's' : ''} selected`} />
        )}
      </div>

      {/* Pricing breakdown */}
      <div className="px-5 py-4 border-b border-gray-100">
        {slots.length > 0 ? (
          <SlotPricingBreakdown slots={slots} isMember={isMember} />
        ) : (
          <p className="text-xs text-gray-400 italic">Select slots to see pricing</p>
        )}
      </div>

      {/* Coupon — disabled per backend inspection findings */}
      <div className="px-5 py-3 border-b border-gray-100">
        <CouponField />
      </div>

      {/* Error */}
      {submitError && (
        <div role="alert" className="mx-5 mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-xs text-red-700">
          {submitError}
        </div>
      )}

      {/* Submit */}
      <div className="px-5 py-4">
        <button
          type="button"
          disabled={slots.length === 0 || isSubmitting}
          onClick={onSubmit}
          aria-busy={isSubmitting}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            slots.length === 0 || isSubmitting
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700',
          )}
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

function SRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-medium text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-xs text-gray-800 text-right">{value}</span>
    </div>
  );
}
