'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient }     from '@tanstack/react-query';
import { cn }                                        from '@/lib/utils/cn';
import { CustomerForm }                              from './customer-form';
import { createBooking, confirmBooking, bookingKeys } from '@/lib/booking.api';
import { slotKeys }                                  from '@/lib/slot.api';
import { formatSlotTime, type Slot }                 from '@/types/slot.types';
import { EMPTY_BOOKING_FORM }                        from '@/types/booking.types';
import type { RateCard }                             from '@/lib/rate-card.api';
import type { Court }                                from '@/types/court.types';
import {
  searchCustomers, customerKeys,
  type CustomerSearchResult,
} from '@/lib/customer.api';
import {
  joinWaitlist, fetchSlotWaitlist, leaveWaitlist, waitlistKeys,
  type WaitlistEntry,
} from '@/lib/waitlist.api';

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

// ── Customer search dropdown ──────────────────────────────────────────────────

function CustomerSearch({
  onSelect,
}: { onSelect: (c: CustomerSearchResult) => void }): React.ReactElement {
  const [q,       setQ]       = useState('');
  const [open,    setOpen]    = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: customerKeys.search(q),
    queryFn:  () => searchCustomers(q),
    enabled:  q.trim().length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Search customer by name, email or phone…"
          className={cn(inputCls, 'pr-8')}
        />
        {isFetching && (
          <svg className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {open && data && data.data.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {data.data.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); onSelect(c); setQ(''); setOpen(false); }}
              >
                <p className="text-sm font-medium text-gray-900 truncate">{c.fullName}</p>
                <p className="text-xs text-gray-400 truncate">{c.email ?? c.phone ?? 'No contact'}</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && q.length >= 2 && !isFetching && (!data || data.data.length === 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-md px-3 py-2">
          <p className="text-xs text-gray-400">No customers found — fill in details below to create a walk-in</p>
        </div>
      )}
    </div>
  );
}

// ── Waitlist section ──────────────────────────────────────────────────────────

function WaitlistSection({
  slot,
  branchId,
  courtId,
}: { slot: Slot; branchId: string; courtId: string }): React.ReactElement {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const { data: entries = [] } = useQuery({
    queryKey: waitlistKeys.slot(slot.id),
    queryFn:  () => fetchSlotWaitlist(slot.id),
    enabled:  slot.status === 'booked' || slot.status === 'reserved',
  });

  const joinMut = useMutation({
    mutationFn: () => joinWaitlist({
      slotId: slot.id, courtId, branchId,
      customerName: name, customerEmail: email, customerPhone: phone,
    }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: waitlistKeys.slot(slot.id) });
      setShowForm(false); setName(''); setEmail(''); setPhone('');
    },
  });

  const leaveMut = useMutation({
    mutationFn: (id: string) => leaveWaitlist(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: waitlistKeys.slot(slot.id) }),
  });

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-amber-800">
          Waitlist{entries.length > 0 ? ` (${entries.length})` : ''}
        </p>
        <button type="button" onClick={() => setShowForm((s) => !s)}
          className="text-[11px] text-amber-600 hover:text-amber-800 font-medium">
          + Add
        </button>
      </div>

      {entries.map((e: WaitlistEntry) => (
        <div key={e.id} className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">
              #{e.position} {e.customerName}
            </p>
            <p className="text-[10px] text-gray-500">{e.status}</p>
          </div>
          <button type="button" onClick={() => leaveMut.mutate(e.id)}
            className="text-[10px] text-red-500 hover:text-red-700 flex-shrink-0 font-medium">
            Remove
          </button>
        </div>
      ))}

      {showForm && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-amber-200">
          <input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Customer name *" className={cn(inputCls, 'text-xs py-1.5')} />
          <input value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" type="email" className={cn(inputCls, 'text-xs py-1.5')} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone" className={cn(inputCls, 'text-xs py-1.5')} />
          <div className="flex gap-1.5">
            <button type="button" onClick={() => joinMut.mutate()}
              disabled={!name.trim() || joinMut.isPending}
              className="flex-1 rounded-md bg-amber-600 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
              {joinMut.isPending ? 'Adding…' : 'Join Waitlist'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-3 rounded-md border border-gray-300 text-xs text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
          </div>
          {joinMut.isError && (
            <p className="text-[10px] text-red-600">
              {joinMut.error instanceof Error ? joinMut.error.message : 'Failed'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main BookingPanel ─────────────────────────────────────────────────────────

export function BookingPanel({
  selectedSlots, courts, branchId, branchName, date, rateCards, onClear, onSuccess,
}: BookingPanelProps): React.ReactElement {
  // date and rateCards reserved for future use (pricing display)
  void date; void rateCards;
  const qc = useQueryClient();

  const [customerForm, setCustomerForm] = useState({
    customerName: '', customerEmail: '', customerPhone: '',
    isMember: false, userId: '', participantCount: 1,
  });
  const [internalNotes, setInternalNotes] = useState('');
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // single booked slot selected → show waitlist
  const singleBookedSlot = selectedSlots.length === 1 && selectedSlots[0]!.status === 'booked'
    ? selectedSlots[0]
    : null;

  useEffect(() => {
    if (selectedSlots.length === 0) setSubmitted(false);
  }, [selectedSlots.length]);

  const slotsByCourt = new Map<string, Slot[]>();
  for (const s of selectedSlots) {
    slotsByCourt.set(s.courtId, [...(slotsByCourt.get(s.courtId) ?? []), s]);
  }

  const totalMinor    = selectedSlots.reduce((sum, s) => sum + (s.priceOverrideMinor ?? s.resolvedPriceMinor ?? 0), 0);
  const currency      = selectedSlots[0]?.currency ?? 'INR';
  const totalDuration = selectedSlots.reduce((s, sl) => s + sl.durationMins, 0);
  const courtIds      = [...new Set(selectedSlots.map((s) => s.courtId))];
  const involvedCourts = courtIds.map((id) => courts.find((c) => c.id === id)).filter(Boolean) as Court[];
  const sortedSlots = [...selectedSlots].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

  // Customer search → fill form
  const handleCustomerSelect = useCallback((c: CustomerSearchResult) => {
    setCustomerForm((f) => ({
      ...f,
      customerName:  c.fullName,
      customerEmail: c.email ?? '',
      customerPhone: c.phone ?? '',
    }));
  }, []);

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
        sportId:          firstCourt?.sportId ?? undefined as never,
        customerName:     customerForm.customerName,
        customerEmail:    customerForm.customerEmail,
        customerPhone:    customerForm.customerPhone,
        isMember:         customerForm.isMember,
        participantCount: customerForm.participantCount,
        internalNotes,
        channel:          'admin',
      });
    },
    onSuccess: async (booking) => { await confirmMut.mutateAsync(booking.id); },
    onError:   () => setSubmitted(false),
  });

  const confirmMut = useMutation({
    mutationFn: (id: string) => confirmBooking(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: slotKeys.all() });
      void qc.invalidateQueries({ queryKey: bookingKeys.all() });
      setCustomerForm({ customerName: '', customerEmail: '', customerPhone: '', isMember: false, userId: '', participantCount: 1 });
      setInternalNotes(''); setSubmitted(false); setErrors({});
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
  const availableSelected = selectedSlots.filter((s) => s.status === 'available');

  return (
    <div className="flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">
          {singleBookedSlot ? 'Slot Details' : 'New Booking'}
        </p>
        {selectedSlots.length > 0 && (
          <button type="button" onClick={onClear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Nothing selected */}
        {selectedSlots.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 py-8 text-center">
            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Click an available slot to begin</p>
            <p className="text-xs text-gray-400">Or drag on the timeline to create a booking</p>
          </div>
        )}

        {/* Booked slot selected — show waitlist */}
        {singleBookedSlot && (
          <div className="p-4 flex flex-col gap-3">
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
              <p className="text-xs font-semibold text-blue-800">
                {formatSlotTime(singleBookedSlot.startAt)} – {formatSlotTime(singleBookedSlot.endAt)}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {courts.find((c) => c.id === singleBookedSlot.courtId)?.name ?? 'Court'}
              </p>
              {singleBookedSlot.bookingId && (
                <p className="text-[10px] text-blue-500 mt-0.5 font-mono">{singleBookedSlot.bookingId.slice(0, 8)}…</p>
              )}
            </div>

            <WaitlistSection
              slot={singleBookedSlot}
              branchId={branchId}
              courtId={singleBookedSlot.courtId}
            />
          </div>
        )}

        {/* Available slots selected — booking form */}
        {availableSelected.length > 0 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
            {/* Summary */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Summary</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <span className="text-gray-500">Venue</span>
                <span className="text-gray-900 font-medium truncate">{branchName || '—'}</span>
                {involvedCourts.length > 0 && (
                  <>
                    <span className="text-gray-500">Court</span>
                    <span className="text-gray-900 font-medium truncate">
                      {involvedCourts.map((c) => c.name).join(', ')}
                    </span>
                  </>
                )}
                {totalDuration > 0 && (
                  <>
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-900 font-medium">{totalDuration} min</span>
                  </>
                )}
              </div>

              {sortedSlots.length > 0 && (
                <div className="mt-1 flex flex-col gap-0.5 max-h-24 overflow-y-auto">
                  {sortedSlots.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-mono">
                        {formatSlotTime(s.startAt)}–{formatSlotTime(s.endAt)}
                      </span>
                      <span className="text-gray-500 font-mono">
                        {formatPrice(s.priceOverrideMinor ?? s.resolvedPriceMinor, s.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1.5 border-t border-gray-200 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600">Total</span>
                <span className="text-base font-bold text-gray-900">
                  {formatPrice(totalMinor, currency)}
                </span>
              </div>
            </div>

            {/* Customer search */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Customer Search
              </p>
              <CustomerSearch onSelect={handleCustomerSelect} />
            </div>

            {/* Customer form */}
            <div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                Customer Details
              </p>
              <CustomerForm
                values={customerForm}
                onChange={(key, val) => {
                  setCustomerForm((f) => ({ ...f, [key]: val }));
                  setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
                }}
                errors={errors as Record<string, string>}
                disabled={isPending}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Internal Notes
              </label>
              <textarea rows={2} value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className={cn(inputCls, 'resize-none text-xs')}
                placeholder="Staff notes…" />
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

            <button
              type="submit"
              disabled={isPending || submitted}
              className={cn(
                'w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'inline-flex items-center justify-center gap-2',
                'bg-primary-600 hover:bg-primary-700 disabled:opacity-70',
              )}
            >
              {isPending && (
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {isPending ? 'Creating…' : `Confirm Walk-in${availableSelected.length > 1 ? ` (${availableSelected.length})` : ''}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
