'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import {
  createBooking, confirmBooking, bookingKeys,
} from '@/lib/booking.api';
import { slotKeys } from '@/lib/slot.api';
import { formatSlotTime, type Slot } from '@/types/slot.types';
import type { RateCard } from '@/lib/rate-card.api';
import { EMPTY_BOOKING_FORM } from '@/types/booking.types';

interface BookingPanelProps {
  selectedSlots: Slot[];
  branchId:      string;
  courtId:       string;
  courtName:     string;
  branchName:    string;
  date:          string;
  rateCard:      RateCard | null;
  onClear:       () => void;
  onSuccess:     () => void;
}

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100';

function formatPrice(minor: number | null, currency: string): string {
  if (minor == null) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function BookingPanel({
  selectedSlots, branchId, courtId, courtName,
  branchName, date, rateCard, onClear, onSuccess,
}: BookingPanelProps): React.ReactElement {
  const qc = useQueryClient();

  const [form, setForm] = useState({
    customerName:  '',
    customerEmail: '',
    customerPhone: '',
    customerNotes: '',
    internalNotes: '',
    isMember:      false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (k: keyof typeof form, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  // Compute effective price from selected slots (priceOverrideMinor wins if set)
  const totalMinor = selectedSlots.reduce(
    (sum, s) => sum + (s.priceOverrideMinor ?? s.resolvedPriceMinor ?? 0), 0,
  );

  const totalDurationMins = selectedSlots.reduce((sum, s) => sum + s.durationMins, 0);
  const currency = selectedSlots[0]?.currency ?? 'GBP';

  const sortedSlots = [...selectedSlots].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.customerName.trim())  e['customerName']  = 'Name is required';
    if (!form.customerPhone.trim()) e['customerPhone'] = 'Mobile number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const createMut = useMutation({
    mutationFn: () => createBooking({
      ...EMPTY_BOOKING_FORM,
      slotIds:       selectedSlots.map((s) => s.id),
      branchId,
      courtId,
      customerName:  form.customerName,
      customerEmail: form.customerEmail,
      customerPhone: form.customerPhone,
      customerNotes: form.customerNotes,
      internalNotes: form.internalNotes,
      isMember:      form.isMember,
      channel:       'admin',
    }),
    onSuccess: async (booking) => {
      // Auto-confirm admin bookings
      await confirmMut.mutateAsync(booking.id);
    },
    onError: () => setSubmitted(false),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => confirmBooking(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: slotKeys.all() });
      void qc.invalidateQueries({ queryKey: bookingKeys.all() });
      setSubmitted(false);
      setForm({
        customerName: '', customerEmail: '', customerPhone: '',
        customerNotes: '', internalNotes: '', isMember: false,
      });
      onSuccess();
    },
    onError: () => setSubmitted(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || !validate()) return;
    setSubmitted(true);
    createMut.mutate();
  };

  const isPending = createMut.isPending || confirmMut.isPending;
  const hasError  = createMut.isError || confirmMut.isError;

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">New Booking</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Booking summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Summary</p>
              {selectedSlots.length > 0 && (
                <button type="button" onClick={onClear}
                  className="text-[10px] text-gray-400 hover:text-red-500 transition-colors">
                  Clear selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <span className="text-gray-500">Venue</span>
              <span className="text-gray-900 font-medium truncate">{branchName || '—'}</span>
              <span className="text-gray-500">Court</span>
              <span className="text-gray-900 font-medium truncate">{courtName || '—'}</span>
              <span className="text-gray-500">Date</span>
              <span className="text-gray-900 font-medium">
                {date ? new Date(date + 'T12:00:00Z').toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                }) : '—'}
              </span>
              <span className="text-gray-500">Duration</span>
              <span className="text-gray-900 font-medium">
                {totalDurationMins > 0 ? `${totalDurationMins} min` : '—'}
              </span>
              {rateCard && (
                <>
                  <span className="text-gray-500">Rate Card</span>
                  <span className="text-gray-900 font-medium truncate">{rateCard.name}</span>
                </>
              )}
            </div>

            {/* Selected slots */}
            {sortedSlots.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1">
                {sortedSlots.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700 font-mono">
                      {formatSlotTime(s.startAt)} – {formatSlotTime(s.endAt)}
                    </span>
                    <span className="text-gray-500">
                      {formatPrice(s.resolvedPriceMinor, s.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Price */}
            <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600">Total</span>
              <span className={cn(
                'text-base font-bold',
                selectedSlots.length > 0 ? 'text-gray-900' : 'text-gray-400',
              )}>
                {selectedSlots.length > 0 ? formatPrice(totalMinor, currency) : '—'}
              </span>
            </div>
          </div>

          {/* Customer details */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Customer</p>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.customerName}
                onChange={(e) => set('customerName', e.target.value)}
                className={cn(inputCls, errors['customerName'] && 'border-red-400 bg-red-50')}
                placeholder="Rahul Sharma" autoComplete="name" />
              {errors['customerName'] && <p className="mt-1 text-xs text-red-600">{errors['customerName']}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mobile <span className="text-red-500">*</span>
              </label>
              <input type="tel" value={form.customerPhone}
                onChange={(e) => set('customerPhone', e.target.value)}
                className={cn(inputCls, errors['customerPhone'] && 'border-red-400 bg-red-50')}
                placeholder="+91 98765 43210" autoComplete="tel" />
              {errors['customerPhone'] && <p className="mt-1 text-xs text-red-600">{errors['customerPhone']}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Email (optional)</label>
              <input type="email" value={form.customerEmail}
                onChange={(e) => set('customerEmail', e.target.value)}
                className={inputCls} placeholder="rahul@example.com" autoComplete="email" />
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-700">
              <input type="checkbox" checked={form.isMember}
                onChange={(e) => set('isMember', e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              Member (member pricing applies)
            </label>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea rows={2} value={form.customerNotes}
                onChange={(e) => set('customerNotes', e.target.value)}
                className={cn(inputCls, 'resize-none')}
                placeholder="Any special requirements…" />
            </div>
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

          {/* Actions */}
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
              ? 'Creating booking…'
              : selectedSlots.length === 0
                ? 'Select slots to book'
                : `Confirm Booking${selectedSlots.length > 1 ? ` (${selectedSlots.length} slots)` : ''}`}
          </button>
        </form>
      </div>
    </div>
  );
}
