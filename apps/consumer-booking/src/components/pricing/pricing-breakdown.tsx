/**
 * pricing-breakdown.tsx
 *
 * PricingBreakdown — renders the complete pricing summary using ONLY data
 * returned by the booking-service.
 *
 * ── What the backend actually returns ────────────────────────────────────────
 *
 * Slot entity:
 *   resolvedPriceMinor   Computed at slot generation time by PricingService
 *   priceOverrideMinor   Admin manual override (wins over resolved)
 *   appliedRuleIds       IDs of pricing rules that fired (no names/amounts)
 *   currency             ISO-4217 code
 *
 * Booking entity:
 *   finalPriceMinor      Sum of effective slot prices, snapshotted at create
 *   amountPaidMinor      Running payment total
 *   amountRefundedMinor  Running refund total
 *   currency
 *
 * What is NOT returned:
 *   - Rule names / breakdown steps (admin-only preview endpoint)
 *   - Per-slot discount amount (embedded in resolvedPriceMinor)
 *   - Membership discount as a separate field
 *   - Tax (taxMinor = 0 hardcoded; tax engine is a future sprint)
 *   - Coupon discount amount (coupon affects slot price at generation time)
 *
 * ── Rendering strategy ───────────────────────────────────────────────────────
 *
 * Slot-level view (wizard / slot selection):
 *   Show per-slot effective price (priceOverrideMinor ?? resolvedPriceMinor),
 *   subtotal across selected slots, and applied rule count if >0.
 *
 * Booking-level view (confirmation / detail):
 *   Show finalPriceMinor, amountPaidMinor, amountRefundedMinor.
 *   Show balance due when amountPaidMinor < finalPriceMinor.
 *
 * No frontend price calculations beyond summing slot prices.
 * Tax: rendered as "Included in price" because taxMinor is always 0.
 * Membership: shown when isMember=true (slot pricing already reflects it).
 */

import { cn }           from '@/lib/utils/cn';
import { formatPrice, slotPrice, type Slot, type Booking } from '@/types/booking.types';

// ── Slot-level breakdown (wizard + reschedule) ────────────────────────────────

interface SlotPricingBreakdownProps {
  slots:      Slot[];
  isMember?:  boolean;
  className?: string;
}

/**
 * SlotPricingBreakdown — shown during slot selection.
 * Renders per-slot effective prices from backend-stored resolvedPriceMinor.
 */
export function SlotPricingBreakdown({ slots, isMember, className }: SlotPricingBreakdownProps): React.ReactElement | null {
  if (slots.length === 0) return null;

  const currency = slots[0]!.currency;
  const lineTotal = slots.reduce((sum, s) => sum + (slotPrice(s) ?? 0), 0);
  const hasOverride = slots.some((s) => s.priceOverrideMinor != null);
  const hasAppliedRules = slots.some((s) => (s.appliedRuleIds?.length ?? 0) > 0);
  const totalRuleCount = slots.reduce((n, s) => n + (s.appliedRuleIds?.length ?? 0), 0);
  const allFree = slots.every((s) => slotPrice(s) == null || slotPrice(s) === 0);

  return (
    <div className={cn('space-y-2', className)}>
      {/* Per-slot lines */}
      {slots.map((slot) => {
        const price = slotPrice(slot);
        return (
          <PriceLine
            key={slot.id}
            label={`${fmtTime(slot.startAt)}–${fmtTime(slot.endAt)}`}
            value={price != null ? formatPrice(price, currency) : 'Free'}
            sub={slot.priceOverrideMinor != null ? 'Admin override' : undefined}
            dim
          />
        );
      })}

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Membership badge */}
      {isMember && hasAppliedRules && (
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Member pricing applied
          </span>
        </div>
      )}

      {/* Override notice */}
      {hasOverride && (
        <p className="text-[10px] text-amber-600">
          * One or more slots have a manual price override set by the venue.
        </p>
      )}

      {/* Applied rules hint */}
      {hasAppliedRules && !isMember && (
        <p className="text-[10px] text-gray-400">
          {totalRuleCount} pricing rule{totalRuleCount !== 1 ? 's' : ''} applied by venue
        </p>
      )}

      {/* Tax note */}
      <PriceLine label="Tax" value="Included" dim />

      {/* Total */}
      <div className="border-t border-gray-200 pt-2">
        <PriceLine
          label="Total"
          value={allFree ? 'Free' : formatPrice(lineTotal, currency)}
          bold
        />
      </div>

      <p className="text-[10px] text-gray-400">
        Prices set by booking service. Final amount confirmed on payment.
      </p>
    </div>
  );
}

// ── Booking-level breakdown (confirmation + detail) ───────────────────────────

interface BookingPricingBreakdownProps {
  booking:    Booking;
  className?: string;
}

/**
 * BookingPricingBreakdown — shown on confirmation and detail pages.
 * Reads finalPriceMinor, amountPaidMinor, amountRefundedMinor from booking entity.
 */
export function BookingPricingBreakdown({ booking, className }: BookingPricingBreakdownProps): React.ReactElement | null {
  const { finalPriceMinor, amountPaidMinor, amountRefundedMinor, currency, isMember } = booking;

  if (finalPriceMinor == null) {
    return (
      <div className={cn('rounded-xl border border-gray-100 bg-gray-50 px-4 py-3', className)}>
        <p className="text-xs text-gray-500">This booking is free — no payment required.</p>
      </div>
    );
  }

  const balance      = finalPriceMinor - amountPaidMinor;
  const hasRefund    = amountRefundedMinor > 0;
  const fullyPaid    = balance <= 0;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Member badge */}
      {isMember && (
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Member pricing
          </span>
        </div>
      )}

      {/* Final price */}
      <PriceLine label="Booking total"  value={formatPrice(finalPriceMinor, currency)} />
      <PriceLine label="Tax"            value="Included"      dim />
      <div className="border-t border-gray-100" />

      {/* Payment status */}
      <PriceLine
        label="Amount paid"
        value={formatPrice(amountPaidMinor, currency)}
        highlight={fullyPaid}
      />

      {/* Refund */}
      {hasRefund && (
        <PriceLine
          label="Refunded"
          value={`– ${formatPrice(amountRefundedMinor, currency)}`}
          dim
        />
      )}

      {/* Balance due */}
      {balance > 0 && (
        <div className="border-t border-amber-100 pt-2">
          <PriceLine
            label="Balance due"
            value={formatPrice(balance, currency)}
            bold
            warn
          />
        </div>
      )}

      {/* Grand total */}
      {fullyPaid && !hasRefund && (
        <div className="border-t border-gray-100 pt-1">
          <PriceLine label="Total paid" value={formatPrice(amountPaidMinor, currency)} bold />
        </div>
      )}
    </div>
  );
}

// ── CouponField ───────────────────────────────────────────────────────────────

/**
 * CouponField — disabled UI per inspection findings.
 *
 * Coupon redemption IS implemented in the backend (BookingService.create()
 * validates and increments redemptionCount atomically). However:
 *
 *   1. Coupon pricing is applied at SLOT GENERATION TIME (embedded in resolvedPriceMinor)
 *   2. There is no public consumer endpoint to preview the coupon discount
 *   3. POST /pricing-rules/preview is admin-only
 *
 * A functional coupon field would require a new public validation endpoint.
 * Until that is built, this component renders a disabled UI with a clear notice.
 */
export function CouponField({ className }: { className?: string }): React.ReactElement {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-medium text-gray-400">
        Coupon code
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          disabled
          placeholder="Enter coupon code"
          aria-label="Coupon code (currently unavailable)"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-400 cursor-not-allowed"
        />
        <button
          type="button"
          disabled
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-400 cursor-not-allowed"
          aria-disabled="true"
        >
          Apply
        </button>
      </div>
      <p className="text-[10px] text-gray-400">
        Coupons will be available in a future update.
      </p>
    </div>
  );
}

// ── Shared sub-component ──────────────────────────────────────────────────────

function PriceLine({
  label, value, dim, bold, highlight, warn, sub,
}: {
  label:      string;
  value:      string;
  dim?:       boolean;
  bold?:      boolean;
  highlight?: boolean;
  warn?:      boolean;
  sub?:       string;
}): React.ReactElement {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <span className={cn(
          'text-xs',
          dim       ? 'text-gray-400' :
          bold      ? 'font-semibold text-gray-900' :
          'text-gray-600',
        )}>
          {label}
        </span>
        {sub && <p className="text-[10px] text-amber-600 mt-0.5">{sub}</p>}
      </div>
      <span className={cn(
        'text-xs text-right flex-shrink-0',
        bold      ? 'font-bold text-gray-900' :
        highlight ? 'font-medium text-emerald-700' :
        warn      ? 'font-semibold text-amber-700' :
        dim       ? 'text-gray-400' :
        'text-gray-700',
      )}>
        {value}
      </span>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
