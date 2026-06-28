'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { CustomerForm }                from './customer-form';
import { createBooking, confirmBooking, bookingKeys } from '@/lib/booking.api';
import { slotKeys }               from '@/lib/slot.api';
import { formatSlotTime, type Slot }                  from '@/types/slot.types';
import { EMPTY_BOOKING_FORM }                         from '@/types/booking.types';
import type { RateCard }                              from '@/lib/rate-card.api';
import type { Court }                                 from '@/types/court.types';

interface BookingPanelProps {
  selectedSlots: Slot[];
  courts:        Court[];
  branchId:      string;
  branchName:    string;
  date:          string;
  rateCards:     Map<string, RateCard>;
  onClear:       () => void;
  onSuccess:     () => void;
}

function formatPrice(minor: number | null, currency: string): string {
  if (minor == null) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(minor / 100);
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';

export function BookingPanel({
  selectedSlots, courts, branchId, branchName, date, rateCards, onClear, onSuccess,
}: BookingPanelProps): React.ReactElement {
  const qc = useQueryClient();

  const [customerForm, setCustomerForm] = useState({
    customerName:   '',
    customerEmail:  '',
    customerPhone:  '',
    isMember:       false,
    userId:         '',
    participantCount: 1,
  });
  const [internalNotes, setInternalNotes] = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Reset form when selection clears
  useEffect(() => {
    if (selectedSlots.length === 0) setSubmitted(false);
  }, [selectedSlots.length]);

  // Group selected slots by court
  const slotsByCourt = new Map<string, Slot[]>();
  for (const s of selectedSlots) {
    slotsByCourt.set(s.courtId, [...(slotsByCourt.get(s.courtId) ?? []), s]);
  }

  // Derive pricing
  const totalMinor = selectedSlots.reduce(
    (sum, s) => sum + (s.priceOverrideMinor ?? s.resolvedPriceMinor ?? 0), 0,
  );
  const hasOverride = selectedSlots.some((s) => s.priceOverrideMinor != null);
  const currency    = selectedSlots[0]?.currency ?? 'GBP';
  const totalDuration = selectedSlots.reduce((s, sl) => s + sl.durationMins, 0);

  // Derive involved courts and rate cards
  const courtIds      = [...new Set(selectedSlots.map((s) => s.courtId))];
  const involvedCourts = courtIds.map((id) => courts.find((c) => c.id === id)).filter(Boolean) as Court[];
  const rateCardNames = courtIds
    .map((id) => courts.find((c) => c.id === id)?.rateCardId)
    .filter(Boolean)
    .map((rcId) => rateCards.get(rcId!)?.name)
    .filter(Boolean);

  const sortedSlots = [...selectedSlots].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!customerForm.customerName.trim())  e['customerName']  = 'Name is required';
    if (!customerForm.customerPhone.trim()) e['customerPhone'] = 'Mobile is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMut = useMutation({
    mutationFn: () => {
      const firstCourt = involvedCourts[0];
      return createBooking({
        ...EMPTY_BOOKING_FORM,
        slotIds:          selectedSlots.map((s) => s.id),
        branchId,
        courtId:          firstCourt?.id ?? '',
        customerName:     customerForm.customerName,
        customerEmail:    customerForm.customerEmail,
        customerPhone:    customerForm.customerPhone,
        isMember:         customerForm.isMember,
        participantCount: customerForm.participantCount,
        internalNotes,
        channel:          'admin',
      });
    },
    onSuccess: async (booking) => {
      await confirmMut.mutateAsync(booking.id);
    },
    onError: () => setSubmitted(false),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => confirmBooking(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: slotKeys.all() });
      void qc.invalidateQueries({ queryKey: bookingKeys.all() });
      setCustomerForm({
        customerName: '', customerEmail: '', customerPhone: '',
        isMember: false, userId: '', participantCount: 1,
      });
      setInternalNotes('');
      setSubmitted(false);
      setErrors({});
      onSuccess();
    },
    onError: () => setSubmitted(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || !validate() || selectedSlots.length === 0) return;
    setSubmitted(true);
    createMut.mutate();
  };

  const isPending = createMut.isPending || confirmMut.isPending;
  const hasError  = createMut.isError || confirmMut.isError;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">New Booking</p>
        {selectedSlots.length > 0 && (
          <button type="button" onClick={onClear}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
          {/* Booking summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Summary</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
              <span className="text-gray-500">Venue</span>
              <span className="text-gray-900 font-medium truncate">{branchName || '—'}</span>
              {involvedCourts.length > 0 && (
                <>
                  <span className="text-gray-500">Court{involvedCourts.length > 1 ? 's' : ''}</span>
                  <span className="text-gray-900 font-medium truncate">
                    {involvedCourts.map((c) => c.name).join(', ')}
                  </span>
                </>
              )}
              <span className="text-gray-500">Date</span>
              <span className="text-gray-900 font-medium">
                {date ? new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short',
                }) : '—'}
              </span>
              {totalDuration > 0 && (
                <>
                  <span className="text-gray-500">Duration</span>
                  <span className="text-gray-900 font-medium">{totalDuration} min</span>
                </>
              )}
              {rateCardNames.length > 0 && (
                <>
                  <span className="text-gray-500">Rate Card</span>
                  <span className="text-gray-900 font-medium truncate">{rateCardNames[0]}</span>
                </>
              )}
            </div>

            {/* Selected slots */}
            {sortedSlots.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1 max-h-28 overflow-y-auto">
                {sortedSlots.map((s) => {
                  const courtName = courts.find((c) => c.id === s.courtId)?.name ?? '';
                  return (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-mono">
                        {courtName && <span className="text-gray-400 mr-1">{courtName}</span>}
                        {formatSlotTime(s.startAt)}–{formatSlotTime(s.endAt)}
                      </span>
                      <span className="text-gray-500 font-mono">
                        {formatPrice(s.priceOverrideMinor ?? s.resolvedPriceMinor, s.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <div className="mt-1.5 pt-2 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Total</span>
              <div className="text-right">
                <span className={cn(
                  'text-base font-bold',
                  selectedSlots.length > 0 ? 'text-gray-900' : 'text-gray-300',
                )}>
                  {selectedSlots.length > 0 ? formatPrice(totalMinor, currency) : '—'}
                </span>
                {hasOverride && (
                  <p className="text-[10px] text-amber-600">Manual override applied</p>
                )}
              </div>
            </div>
          </div>

          {/* Customer details — reuse existing CustomerForm */}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
            <CustomerForm
              values={customerForm}
              onChange={(key, val) => {
                setCustomerForm((f) => ({ ...f, [key]: val }));
                setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
              }}
              errors={errors as Record<string, string>}
            />
          </div>

          {/* Internal notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Internal notes</label>
            <textarea rows={2} value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className={cn(inputCls, 'resize-none text-xs')}
              placeholder="Staff notes (not shown to customer)…" />
          </div>

          {/* Error */}
          {hasError && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              {createMut.error instanceof Error
                ? createMut.error.message
                : confirmMut.error instanceof Error
                  ? confirmMut.error.message
                  : 'Booking failed — please try again.'}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isPending || submitted || selectedSlots.length === 0}
            aria-busy={isPending}
            className={cn(
              'w-full rounded-lg py-3 text-sm font-semibold text-white transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
              'inline-flex items-center justify-center gap-2',
              selectedSlots.length === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 disabled:opacity-70',
            )}
          >
            {isPending && (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isPending
              ? 'Creating…'
              : selectedSlots.length === 0
                ? 'Select slots to book'
                : `Confirm Booking${selectedSlots.length > 1 ? ` (${selectedSlots.length})` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
