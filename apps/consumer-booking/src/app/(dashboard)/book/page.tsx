'use client';

/**
 * /book — Consumer booking wizard
 *
 * Step 1: Venue selection
 * Step 2: Court selection (filtered by venue)
 * Step 3: Date selection
 * Step 4: Slot grid (availability) + multi-select + summary → submit
 *
 * All data from booking-service. No fabricated availability logic.
 */

import { useState, useCallback }  from 'react';
import { useRouter }               from 'next/navigation';
import { useQuery, useMutation }   from '@tanstack/react-query';
import { useSession }              from 'next-auth/react';
import { cn }                      from '@/lib/utils/cn';
import { StepIndicator }           from '@/components/booking/step-indicator';
import { SlotGrid }                from '@/components/booking/slot-grid';
import { BookingSummaryCard }      from '@/components/booking/booking-summary-card';
import { fetchVenues, venueKeys }  from '@/lib/api/venue.api';
import { fetchCourts, courtKeys }  from '@/lib/api/court.api';
import { fetchDaySlots, slotKeys } from '@/lib/api/slot.api';
import { createBooking, bookingKeys } from '@/lib/api/booking.api';
import type { Venue, Court, Slot, CreateBookingPayload } from '@/types/booking.types';

// ── Wizard steps ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Venue'  },
  { id: 2, label: 'Court'  },
  { id: 3, label: 'Date'   },
  { id: 4, label: 'Slots'  },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BookPage(): React.ReactElement {
  const router         = useRouter();
  const { data: session } = useSession();

  const [step,         setStep]         = useState(1);
  const [venueId,      setVenueId]      = useState('');
  const [courtId,      setCourtId]      = useState('');
  const [branchId,     setBranchId]     = useState('');
  const [date,         setDate]         = useState(todayISO());
  const [selectedIds,  setSelectedIds]  = useState<string[]>([]);
  const [submitError,  setSubmitError]  = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────

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
    enabled:  !!courtId && !!branchId && !!date && step === 4,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const venues  = venuesQuery.data   ?? [];
  const courts  = courtsQuery.data   ?? [];
  const slots   = slotsQuery.data    ?? [];

  const selectedVenue = venues.find((v) => v.id === venueId) ?? null;
  const selectedCourt = courts.find((c) => c.id === courtId) ?? null;
  const selectedSlots = slots.filter((s) => selectedIds.includes(s.id));

  // Sort selectedSlots by startAt for display
  const sortedSelectedSlots = [...selectedSlots].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  // ── Slot toggle (multi-select) ─────────────────────────────────────────────

  const handleToggle = useCallback((slot: Slot) => {
    setSelectedIds((prev) => {
      if (prev.includes(slot.id)) return prev.filter((id) => id !== slot.id);
      return [...prev, slot.id];
    });
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
    onSuccess:  (booking) => {
      router.push(`/book/confirmation?id=${booking.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? 'Booking failed. Please try again.';
      setSubmitError(typeof msg === 'string' ? msg : 'Booking failed. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!session?.user) { router.push('/login'); return; }
    if (selectedIds.length === 0 || !courtId || !branchId) return;

    setSubmitError(null);

    const payload: CreateBookingPayload = {
      slotIds:  selectedIds,
      branchId,
      courtId,
      customer: {
        name:   session.user.name ?? session.user.email ?? 'Guest',
        email:  session.user.email ?? '',
        userId: session.user.id ?? undefined,
      },
      channel: 'online',
    };

    mutation.mutate(payload);
  };

  // ── Step navigation ────────────────────────────────────────────────────────

  const goBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      if (step === 4) setSelectedIds([]);
      if (step === 3) { setDate(todayISO()); setSelectedIds([]); }
      if (step === 2) { setCourtId(''); setBranchId(''); setSelectedIds([]); }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Book a court</h1>
        <p className="mt-0.5 text-xs text-gray-400">Choose your venue, court and time</p>
      </div>

      {/* Step indicator */}
      <StepIndicator steps={STEPS} currentStep={step} />

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Wizard panels — left side */}
        <div className="flex-1 min-w-0">

          {/* Step 1 — Venue */}
          {step === 1 && (
            <WizardPanel title="Select a venue" loading={venuesQuery.isLoading} error={venuesQuery.error ? 'Failed to load venues' : null}>
              {venues.length === 0 && !venuesQuery.isLoading ? (
                <EmptyState message="No venues found." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="listbox" aria-label="Venues">
                  {venues.map((venue) => (
                    <SelectionCard
                      key={venue.id}
                      selected={venueId === venue.id}
                      onClick={() => { setVenueId(venue.id); setCourtId(''); setBranchId(''); setStep(2); }}
                      label={venue.name}
                    />
                  ))}
                </div>
              )}
            </WizardPanel>
          )}

          {/* Step 2 — Court */}
          {step === 2 && (
            <WizardPanel title="Select a court" loading={courtsQuery.isLoading} error={courtsQuery.error ? 'Failed to load courts' : null}>
              {courts.length === 0 && !courtsQuery.isLoading ? (
                <EmptyState message="No courts available at this venue." />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="listbox" aria-label="Courts">
                  {courts.map((court) => (
                    <SelectionCard
                      key={court.id}
                      selected={courtId === court.id}
                      onClick={() => {
                        setCourtId(court.id);
                        setBranchId(court.branchId);
                        setStep(3);
                      }}
                      label={court.name}
                      meta={[
                        court.courtType,
                        court.surfaceType?.replace(/_/g, ' '),
                        court.status !== 'available' ? court.status : null,
                      ].filter(Boolean).join(' · ')}
                      disabled={court.status !== 'available'}
                    />
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
                  <label htmlFor="booking-date" className="block text-xs font-medium text-gray-700 mb-1.5">
                    Select date
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    value={date}
                    min={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                    className="block w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={!date}
                  onClick={() => { setSelectedIds([]); setStep(4); }}
                  className="self-start rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Check availability
                </button>
              </div>
            </WizardPanel>
          )}

          {/* Step 4 — Slot grid */}
          {step === 4 && (
            <WizardPanel
              title="Select time slots"
              subtitle="You can select multiple consecutive slots"
              loading={slotsQuery.isLoading}
              error={slotsQuery.error ? 'Failed to load slots. Please try again.' : null}
              onRetry={() => void slotsQuery.refetch()}
            >
              <SlotGrid
                slots={slots}
                selectedIds={selectedIds}
                onToggle={handleToggle}
                isLoading={slotsQuery.isLoading}
              />
            </WizardPanel>
          )}

          {/* Back button */}
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:underline"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back
            </button>
          )}
        </div>

        {/* Right column — Summary (step 4 only on desktop, always show below on mobile) */}
        {step === 4 && (
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0">
            <BookingSummaryCard
              venue={selectedVenue}
              court={selectedCourt}
              date={date}
              slots={sortedSelectedSlots}
              onSubmit={handleSubmit}
              isSubmitting={mutation.isPending}
              submitError={submitError}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WizardPanel({
  title, subtitle, loading, error, onRetry, children,
}: {
  title:     string;
  subtitle?: string;
  loading?:  boolean;
  error?:    string | null;
  onRetry?:  () => void;
  children:  React.ReactNode;
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
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading…
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-red-500">{error}</p>
            {onRetry && (
              <button type="button" onClick={onRetry}
                className="text-xs font-medium text-blue-600 hover:underline">
                Try again
              </button>
            )}
          </div>
        ) : children}
      </div>
    </div>
  );
}

function SelectionCard({
  label, meta, selected, onClick, disabled,
}: {
  label:     string;
  meta?:     string;
  selected:  boolean;
  onClick:   () => void;
  disabled?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
        disabled
          ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
          : selected
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer',
      )}
    >
      <span className={cn('text-sm font-medium', selected ? 'text-blue-900' : 'text-gray-900')}>
        {label}
      </span>
      {meta && (
        <span className="mt-0.5 text-xs capitalize text-gray-400">{meta}</span>
      )}
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
