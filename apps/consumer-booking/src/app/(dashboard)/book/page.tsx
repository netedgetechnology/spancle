'use client';

/**
 * /book — Unified booking wizard (member + guest)
 *
 * Session present  → member flow: customer from session, POST /bookings
 * No session       → guest flow:  GuestCustomerForm step added,
 *                                  POST /guest/session → POST /guest/bookings
 *
 * One wizard. One component tree. Mode determined by useSession().
 * Steps:
 *   1 Venue
 *   2 Court
 *   3 Date
 *   4 Slots
 *   5 Your details  (guest only — step 4 for members is final)
 */

import { useState, useCallback }    from 'react';
import { useRouter }                 from 'next/navigation';
import { useQuery, useMutation }     from '@tanstack/react-query';
import { useSession }                from 'next-auth/react';
import { cn }                        from '@/lib/utils/cn';
import { StepIndicator }             from '@/components/booking/step-indicator';
import { SlotGrid }                  from '@/components/booking/slot-grid';
import { BookingSummaryCard }        from '@/components/booking/booking-summary-card';
import { GuestCustomerForm, validateGuestCustomer } from '@/components/booking/guest-customer-form';
import type { GuestCustomerFields }  from '@/components/booking/guest-customer-form';
import { fetchVenues, venueKeys }    from '@/lib/api/venue.api';
import { fetchCourts, courtKeys }    from '@/lib/api/court.api';
import { fetchDaySlots, slotKeys }   from '@/lib/api/slot.api';
import { createBooking, bookingKeys } from '@/lib/api/booking.api';
import { issueGuestSession, createGuestBooking } from '@/lib/api/guest.api';
import { initiatePayment, initiateGuestPayment, type InitiatePaymentResult } from '@/lib/api/payment.api';
import { PaymentStep, type GuestConfirmParams } from '@/components/payment/payment-step';
import type { Venue, Court, Slot, CreateBookingPayload } from '@/types/booking.types';

// ── Steps ─────────────────────────────────────────────────────────────────────

const MEMBER_STEPS = [
  { id: 1, label: 'Venue'   },
  { id: 2, label: 'Court'   },
  { id: 3, label: 'Date'    },
  { id: 4, label: 'Slots'   },
  { id: 5, label: 'Payment' },
];

const GUEST_STEPS = [
  { id: 1, label: 'Venue'   },
  { id: 2, label: 'Court'   },
  { id: 3, label: 'Date'    },
  { id: 4, label: 'Slots'   },
  { id: 5, label: 'Details' },
  { id: 6, label: 'Payment' },
];

function todayISO() { return new Date().toISOString().slice(0, 10); }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookPage(): React.ReactElement {
  const router             = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isGuest            = sessionStatus !== 'authenticated';
  const steps              = isGuest ? GUEST_STEPS : MEMBER_STEPS;

  const [step,         setStep]         = useState(1);
  const [venueId,      setVenueId]      = useState('');
  const [courtId,      setCourtId]      = useState('');
  const [branchId,     setBranchId]     = useState('');
  const [date,         setDate]         = useState(todayISO());
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [guestFields,  setGuestFields]  = useState<GuestCustomerFields>({ name: '', email: '', phone: '' });
  const [guestErrors,  setGuestErrors]  = useState<Partial<Record<keyof GuestCustomerFields, string>>>({});
  // Payment state — set after booking creation, triggers payment step
  const [paymentResult, setPaymentResult] = useState<InitiatePaymentResult | null>(null);
  const [guestConfirmParams, setGuestConfirmParams] = useState<GuestConfirmParams | null>(null);
  const [bookingForPayment, setBookingForPayment] = useState<{ id: string; ref: string; amountMinor: number; currency: string; branchId: string } | null>(null);

  // ── Queries ───────────────────────────────────────────────────────────────

  const venuesQuery = useQuery({
    queryKey: venueKeys.list(),
    queryFn:  () => fetchVenues(),
    staleTime: 5 * 60_000,
  });

  const courtsQuery = useQuery({
    queryKey: courtKeys.list({ venueId }),
    queryFn:  () => fetchCourts({ venueId }),
    enabled:  !!venueId,
    staleTime: 5 * 60_000,
  });

  const slotsQuery = useQuery({
    queryKey: slotKeys.availability(courtId, branchId, date),
    queryFn:  () => fetchDaySlots({ courtId, branchId, date }),
    enabled:  !!courtId && !!branchId && step >= 4,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const venues = venuesQuery.data ?? [];
  const courts = courtsQuery.data ?? [];
  const slots  = slotsQuery.data  ?? [];

  const selectedVenue = venues.find((v) => v.id === venueId) ?? null;
  const selectedCourt = courts.find((c) => c.id === courtId) ?? null;
  const selectedSlots = [...slots.filter((s) => selectedIds.includes(s.id))].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const handleToggle = useCallback((slot: Slot) => {
    setSelectedIds((prev) =>
      prev.includes(slot.id) ? prev.filter((id) => id !== slot.id) : [...prev, slot.id],
    );
  }, []);

  // ── Mutations ─────────────────────────────────────────────────────────────

  const memberMutation = useMutation({
    mutationFn: async (payload: CreateBookingPayload) => {
      const booking = await createBooking(payload);
      // Initiate payment immediately after booking — no navigation yet
      const payment = await initiatePayment({
        bookingId:   booking.id,
        branchId:    payload.branchId,
        amountMinor: booking.finalPriceMinor ?? 0,
        currency:    booking.currency ?? 'GBP',
        customerEmail: payload.customer.email,
        customerId:    payload.customer.userId,
      });
      return { booking, payment };
    },
    onSuccess: ({ booking, payment }) => {
      setBookingForPayment({
        id:          booking.id,
        ref:         booking.reference,
        amountMinor: booking.finalPriceMinor ?? 0,
        currency:    booking.currency ?? 'GBP',
        branchId,
      });
      setPaymentResult(payment);
      // Member payment step is step 5
      setStep(5);
    },
    onError: (err: unknown) => setSubmitError((err as { message?: string })?.message ?? 'Booking failed'),
  });

  const guestMutation = useMutation({
    mutationFn: async () => {
      const { token } = await issueGuestSession();
      return createGuestBooking({
        guestSession:  token,
        slotIds:       selectedIds,
        branchId,
        courtId,
        customer: {
          name:  guestFields.name.trim(),
          email: guestFields.email.toLowerCase().trim(),
          phone: guestFields.phone.trim() || undefined,
        },
      });
    },
    onSuccess: async (result) => {
      try {
        const payment = await initiateGuestPayment({
          guestPaymentToken: result.guestPaymentToken,
          bookingId:         result.booking.id,
          branchId,
        });
        setBookingForPayment({
          id:          result.booking.id,
          ref:         result.booking.reference,
          amountMinor: result.booking.finalPriceMinor ?? 0,
          currency:    result.booking.currency ?? 'GBP',
          branchId,
        });
        setGuestConfirmParams({
          ref:   result.booking.reference,
          token: result.guestLookupToken,
          qr:    result.qr?.qrContent,
          email: guestFields.email.toLowerCase().trim(),
        });
        setPaymentResult(payment);
        // Guest payment step is step 6
        setStep(6);
      } catch {
        // If payment initiation fails, fall back to confirmation page
        const params = new URLSearchParams({
          id:    result.booking.id,
          ref:   result.booking.reference,
          guest: '1',
          ...(result.guestLookupToken ? { token: result.guestLookupToken } : {}),
          ...(result.qr?.qrContent    ? { qr:    result.qr.qrContent }     : {}),
        });
        router.push(`/book/confirmation?${params.toString()}`);
      }
    },
    onError: (err: unknown) => setSubmitError((err as { message?: string })?.message ?? 'Booking failed'),
  });

  const handleSubmit = () => {
    setSubmitError(null);
    if (isGuest) {
      const errs = validateGuestCustomer(guestFields);
      if (Object.keys(errs).length) { setGuestErrors(errs); return; }
      guestMutation.mutate();
    } else {
      if (!session?.user) { router.push('/login'); return; }
      memberMutation.mutate({
        slotIds: selectedIds, branchId, courtId,
        customer: {
          name:   session.user.name  ?? session.user.email ?? 'Guest',
          email:  session.user.email ?? '',
          userId: session.user.id    ?? undefined,
        },
        channel: 'online',
      });
    }
  };

  const isSubmitting = memberMutation.isPending || guestMutation.isPending;

  // Slot selection is where the booking is submitted (step 4 for member, step 4 for guest)
  // Step 5 (member) and step 6 (guest) are the payment step rendered by PaymentStep
  const isFinalStep = step === steps[steps.length - 1]!.id;

  const goBack = () => {
    if (step > 1) {
      if (step === 4) setSelectedIds([]);
      if (step === 3) { setDate(todayISO()); setSelectedIds([]); }
      if (step === 2) { setCourtId(''); setBranchId(''); setSelectedIds([]); }
      setStep((s) => s - 1);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Book a court</h1>
        <p className="mt-0.5 text-xs text-gray-400">
          {isGuest ? 'Book as a guest — no account required' : 'Choose your venue, court and time'}
        </p>
      </div>

      <StepIndicator steps={steps} currentStep={step} />

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0">

          {/* Step 1 — Venue */}
          {step === 1 && (
            <WizardPanel title="Select a venue" loading={venuesQuery.isLoading} error={venuesQuery.error ? 'Failed to load venues' : null}>
              {!venuesQuery.isLoading && venues.length === 0
                ? <EmptyState message="No venues found." />
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {venues.map((v) => (
                      <SelectCard key={v.id} label={v.name} selected={venueId === v.id}
                        onClick={() => { setVenueId(v.id); setCourtId(''); setBranchId(''); setStep(2); }} />
                    ))}
                  </div>
                )}
            </WizardPanel>
          )}

          {/* Step 2 — Court */}
          {step === 2 && (
            <WizardPanel title="Select a court" loading={courtsQuery.isLoading} error={courtsQuery.error ? 'Failed to load courts' : null}>
              {!courtsQuery.isLoading && courts.length === 0
                ? <EmptyState message="No courts available at this venue." />
                : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courts.map((c) => (
                      <SelectCard key={c.id} label={c.name} selected={courtId === c.id} disabled={c.status !== 'available'}
                        meta={[c.courtType, c.surfaceType?.replace(/_/g, ' '), c.status !== 'available' ? c.status : null].filter(Boolean).join(' · ')}
                        onClick={() => { setCourtId(c.id); setBranchId(c.branchId); setStep(3); }} />
                    ))}
                  </div>
                )}
            </WizardPanel>
          )}

          {/* Step 3 — Date */}
          {step === 3 && (
            <WizardPanel title="Choose a date">
              <div className="flex flex-col gap-4">
                <div>
                  <label htmlFor="booking-date" className="block text-xs font-medium text-gray-700 mb-1.5">Select date</label>
                  <input id="booking-date" type="date" value={date} min={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <button type="button" disabled={!date} onClick={() => { setSelectedIds([]); setStep(4); }}
                  className="self-start rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Check availability
                </button>
              </div>
            </WizardPanel>
          )}

          {/* Step 4 — Slots */}
          {step === 4 && (
            <WizardPanel title="Select time slots" subtitle="You can select multiple consecutive slots"
              loading={slotsQuery.isLoading} error={slotsQuery.error ? 'Failed to load slots.' : null} onRetry={() => void slotsQuery.refetch()}>
              <SlotGrid slots={slots} selectedIds={selectedIds} onToggle={handleToggle} isLoading={slotsQuery.isLoading} />
              {/* Member final step: show proceed button inline */}
              {!isGuest && selectedIds.length > 0 && (
                <div className="mt-4 lg:hidden">
                  {/* Mobile: summary shown below on same step */}
                </div>
              )}
              {/* Guest: next goes to details step */}
              {isGuest && selectedIds.length > 0 && (
                <button type="button" onClick={() => setStep(5)}
                  className="mt-4 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Continue to your details →
                </button>
                {/* Member final step: slots → submit → payment */}
              )}
            </WizardPanel>
          )}

          {/* Step 5 — Guest details (guest only) */}
          {step === 5 && isGuest && (
            <WizardPanel title="Your details" subtitle="No account needed — just your name and email">
              <GuestCustomerForm value={guestFields} onChange={setGuestFields} errors={guestErrors} />
              {submitError && (
                <div role="alert" className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {submitError}
                </div>
              )}
              {/* Mobile submit on guest details step */}
              <button type="button" disabled={isSubmitting}
                onClick={handleSubmit}
                className={cn(
                  'mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors lg:hidden',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  isSubmitting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700',
                )} aria-busy={isSubmitting}>
                {isSubmitting ? 'Booking…' : 'Confirm booking'}
              </button>
            </WizardPanel>
          )}


          {/* Payment step — member (step 5) and guest (step 6) */}
          {paymentResult && bookingForPayment && paymentResult.clientSecret && (
            <PaymentStep
              clientSecret={paymentResult.clientSecret}
              bookingId={bookingForPayment.id}
              bookingRef={bookingForPayment.ref}
              amountMinor={bookingForPayment.amountMinor}
              currency={bookingForPayment.currency}
              isGuest={isGuest}
              guestParams={guestConfirmParams ?? undefined}
              onBack={() => {
                // Back from payment: stay on current booking, reset payment state
                // The booking already exists; do NOT re-create it
                setPaymentResult(null);
                setBookingForPayment(null);
                setGuestConfirmParams(null);
                setStep(isGuest ? 5 : 4);
              }}
            />
          )}

          {/* Payment initiation without clientSecret (idempotent retry or Razorpay) */}
          {paymentResult && bookingForPayment && !paymentResult.clientSecret && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900">Payment pending</p>
              <p className="text-xs text-amber-700 mt-1">
                A payment is already in progress for this booking.
                Reference: <span className="font-mono">{bookingForPayment.ref}</span>
              </p>
              <button type="button" onClick={() => router.push(
                isGuest
                  ? `/book/confirmation?id=${bookingForPayment.id}&ref=${bookingForPayment.ref}&guest=1`
                  : `/book/confirmation?id=${bookingForPayment.id}`
              )} className="mt-3 text-xs font-medium text-amber-800 underline">
                View booking status →
              </button>
            </div>
          )}

          {/* Back button */}
          {step > 1 && !paymentResult && (
            <button type="button" onClick={goBack}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:underline">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Right column — Summary (shown at final step for member; at step 5 for guest) */}
        {((step === 4 && !isGuest) || (step === 5 && isGuest)) && !paymentResult && (
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <BookingSummaryCard
              venue={selectedVenue} court={selectedCourt} date={date}
              slots={selectedSlots} isMember={!isGuest}
              onSubmit={handleSubmit} isSubmitting={isSubmitting}
              submitError={isGuest ? null : submitError}
            />
            {/* Sign-in nudge for guests */}
            {isGuest && step === 5 && (
              <p className="mt-3 text-center text-xs text-gray-400">
                Already have an account?{' '}
                <a href="/login?callbackUrl=/book" className="font-medium text-blue-600 hover:underline">
                  Sign in
                </a>
                {' '}for faster checkout.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WizardPanel({ title, subtitle, loading, error, onRetry, children }: {
  title: string; subtitle?: string; loading?: boolean;
  error?: string | null; onRetry?: () => void; children?: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-sm text-gray-400">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-red-500">{error}</p>
            {onRetry && <button type="button" onClick={onRetry} className="text-xs font-medium text-blue-600 hover:underline">Try again</button>}
          </div>
        ) : children}
      </div>
    </div>
  );
}

function SelectCard({ label, meta, selected, onClick, disabled }: {
  label: string; meta?: string; selected: boolean; onClick: () => void; disabled?: boolean;
}): React.ReactElement {
  return (
    <button type="button" role="option" aria-selected={selected} disabled={disabled} onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        disabled ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
          : selected ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer',
      )}>
      <span className={cn('text-sm font-medium', selected ? 'text-blue-900' : 'text-gray-900')}>{label}</span>
      {meta && <span className="mt-0.5 text-xs capitalize text-gray-400">{meta}</span>}
    </button>
  );
}

function EmptyState({ message }: { message: string }): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
