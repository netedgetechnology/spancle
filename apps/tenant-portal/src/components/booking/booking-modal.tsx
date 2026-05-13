'use client';

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { SlotSelectionPanel } from './slot-selection-panel';
import { CustomerForm }       from './customer-form';
import { fetchBranches, branchKeys } from '@/lib/branch.api';
import { fetchCourts,   courtKeys  } from '@/lib/court.api';
import { createBooking, bookingKeys } from '@/lib/booking.api';
import {
  EMPTY_BOOKING_FORM,
  type BookingFormValues,
} from '@/types/booking.types';
import { todayString } from '@/types/slot.types';

interface BookingModalProps {
  onClose:        () => void;
  defaultDate?:   string;
  defaultCourtId?: string;
  defaultBranchId?: string;
}

type Step = 'slots' | 'customer' | 'confirm';

function validate(form: BookingFormValues, step: Step): Partial<Record<string, string>> {
  const errs: Record<string, string> = {};
  if (step === 'slots' || step === 'confirm') {
    if (form.slotIds.length === 0) errs['slotIds'] = 'Select at least one slot';
    if (!form.branchId)            errs['branchId'] = 'Branch is required';
    if (!form.courtId)             errs['courtId']  = 'Court is required';
  }
  if (step === 'customer' || step === 'confirm') {
    if (!form.customerName.trim())  errs['customerName']  = 'Name is required';
    if (!form.customerEmail.trim()) errs['customerEmail'] = 'Email is required';
    if (form.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail))
      errs['customerEmail'] = 'Valid email required';
  }
  return errs;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'slots',    label: 'Slots'    },
  { id: 'customer', label: 'Customer' },
  { id: 'confirm',  label: 'Confirm'  },
];

/**
 * BookingModal — multi-step booking creation dialog.
 *
 * Step 1 — Slots:    date + branch + court selectors + SlotSelectionPanel
 * Step 2 — Customer: CustomerForm + channel + notes + optional recurrence
 * Step 3 — Confirm:  Summary + submit
 */
export function BookingModal({
  onClose,
  defaultDate     = todayString(),
  defaultCourtId  = '',
  defaultBranchId = '',
}: BookingModalProps): React.ReactElement {
  const queryClient = useQueryClient();
  const [step, setStep]     = useState<Step>('slots');
  const [form, setForm]     = useState<BookingFormValues>({
    ...EMPTY_BOOKING_FORM,
    courtId:  defaultCourtId,
    branchId: defaultBranchId,
  });
  const [date, setDate]     = useState(defaultDate);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = useCallback(
    <K extends keyof BookingFormValues>(key: K, val: BookingFormValues[K]) => {
      setForm((f) => ({ ...f, [key]: val }));
      setErrors((e) => { const n: Record<string, string> = { ...e }; delete n[key]; return n; });
    },
    [],
  );

  const { data: branches = [] } = useQuery({
    queryKey: branchKeys.list(),
    queryFn:  () => fetchBranches(),
    staleTime: 60_000,
  });

  const { data: courts = [] } = useQuery({
    queryKey: courtKeys.list(form.branchId ? { branchId: form.branchId } : {}),
    queryFn:  () => fetchCourts(form.branchId ? { branchId: form.branchId } : undefined),
    staleTime: 60_000,
    enabled:  !!form.branchId,
  });

  const mutation = useMutation({
    mutationFn: () => createBooking(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: bookingKeys.all() });
      onClose();
    },
  });

  const goNext = (): void => {
    const errs = validate(form, step);
    if (Object.keys(errs).length > 0) { setErrors(errs as Record<string, string>); return; }
    setErrors({});
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]!.id);
  };

  const goBack = (): void => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1]!.id);
  };


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal
      aria-label="Create booking"
    >
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">New booking</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Step {STEPS.findIndex((s) => s.id === step) + 1} of {STEPS.length} — {STEPS.find((s) => s.id === step)?.label}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 focus:outline-none"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
          {STEPS.map((s, i) => {
            const current = STEPS.findIndex((x) => x.id === step);
            return (
              <div key={s.id} className="flex-1 flex flex-col gap-1">
                <div className={cn(
                  'h-1 rounded-full transition-colors',
                  i <= current ? 'bg-primary-600' : 'bg-gray-200',
                )} />
                <p className={cn(
                  'text-[10px] font-medium',
                  i === current ? 'text-primary-700' : i < current ? 'text-emerald-600' : 'text-gray-400',
                )}>
                  {s.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── Step 1: Slots ──────────────────────────────────────────────── */}
          {step === 'slots' && (
            <div className="flex flex-col gap-4">
              {errors['slotIds'] && (
                <p className="text-xs text-red-600">{errors['slotIds']}</p>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => { setDate(e.target.value); set('slotIds', []); }}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>

              {/* Branch */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Branch <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.branchId}
                  onChange={(e) => { set('branchId', e.target.value); set('courtId', ''); set('slotIds', []); }}
                  className={cn('block w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200', errors['branchId'] ? 'border-red-400' : 'border-gray-300 focus:border-primary-500')}
                >
                  <option value="">Select branch…</option>
                  {branches.filter((b) => b.status !== 'archived').map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {errors['branchId'] && <p className="mt-1 text-xs text-red-600">{errors['branchId']}</p>}
              </div>

              {/* Court */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Court <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.courtId}
                  onChange={(e) => { set('courtId', e.target.value); set('slotIds', []); }}
                  disabled={!form.branchId}
                  className={cn('block w-full rounded-lg border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 disabled:opacity-50', errors['courtId'] ? 'border-red-400' : 'border-gray-300 focus:border-primary-500')}
                >
                  <option value="">Select court…</option>
                  {courts.filter((c) => c.status !== 'retired').map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors['courtId'] && <p className="mt-1 text-xs text-red-600">{errors['courtId']}</p>}
              </div>

              {/* Slot picker */}
              {form.courtId && form.branchId && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Available slots <span className="text-red-500">*</span>
                  </label>
                  <SlotSelectionPanel
                    date={date}
                    courtId={form.courtId}
                    branchId={form.branchId}
                    selectedIds={form.slotIds}
                    onChange={(ids) => set('slotIds', ids)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Customer ───────────────────────────────────────────── */}
          {step === 'customer' && (
            <div className="flex flex-col gap-5">
              <CustomerForm
                values={{
                  customerName:     form.customerName,
                  customerEmail:    form.customerEmail,
                  customerPhone:    form.customerPhone,
                  isMember:         form.isMember,
                  userId:           form.userId,
                  participantCount: form.participantCount,
                }}
                onChange={(key, val) => set(key, val as never)}
                errors={errors}
              />

              {/* Channel */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Booking channel</label>
                <select
                  value={form.channel}
                  onChange={(e) => set('channel', e.target.value as BookingFormValues['channel'])}
                  className="block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                >
                  <option value="admin">Admin</option>
                  <option value="online">Online</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="api">API</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Internal notes</label>
                <textarea
                  rows={2}
                  value={form.internalNotes}
                  onChange={(e) => set('internalNotes', e.target.value)}
                  placeholder="Admin notes — not visible to customer"
                  className="block w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </div>

              {/* Recurrence */}
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.enableRecurrence}
                    onClick={() => set('enableRecurrence', !form.enableRecurrence)}
                    className={cn(
                      'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none',
                      form.enableRecurrence ? 'bg-primary-600' : 'bg-gray-300',
                    )}
                  >
                    <span className={cn(
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow mt-[3px] transition-transform',
                      form.enableRecurrence ? 'translate-x-[18px]' : 'translate-x-0.5',
                    )} />
                  </button>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Recurring booking</p>
                    <p className="text-xs text-gray-400">Automatically create future occurrences</p>
                  </div>
                </label>

                {form.enableRecurrence && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Frequency</label>
                      <select
                        value={form.recurrenceFrequency}
                        onChange={(e) => set('recurrenceFrequency', e.target.value as BookingFormValues['recurrenceFrequency'])}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Occurrences</label>
                      <input
                        type="number"
                        min={2}
                        max={52}
                        value={form.recurrenceOccurrences}
                        onChange={(e) => set('recurrenceOccurrences', Math.max(2, Number(e.target.value)))}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 3: Confirm ────────────────────────────────────────────── */}
          {step === 'confirm' && (
            <div className="flex flex-col gap-4">
              {mutation.error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {(mutation.error as { message?: string }).message ?? 'Failed to create booking'}
                </div>
              )}

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 flex flex-col gap-3">
                <SummaryRow label="Customer"     value={form.customerName}                          />
                <SummaryRow label="Email"        value={form.customerEmail}                         />
                {form.customerPhone && <SummaryRow label="Phone" value={form.customerPhone} />}
                <SummaryRow label="Slots"        value={`${form.slotIds.length} slot${form.slotIds.length !== 1 ? 's' : ''}`} />
                <SummaryRow label="Date"         value={new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })} />
                <SummaryRow label="Participants" value={String(form.participantCount)} />
                <SummaryRow label="Member"       value={form.isMember ? 'Yes' : 'No'} />
                <SummaryRow label="Channel"      value={form.channel.replace(/_/g, ' ')} />
                {form.enableRecurrence && (
                  <SummaryRow
                    label="Recurring"
                    value={`${form.recurrenceOccurrences}× ${form.recurrenceFrequency}`}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={step === 'slots' ? onClose : goBack}
            disabled={mutation.isPending}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {step === 'slots' ? 'Cancel' : 'Back'}
          </button>

          {step !== 'confirm' ? (
            <button
              type="button"
              onClick={goNext}
              className="px-5 py-2 rounded-lg bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate()}
              className="px-5 py-2 rounded-lg bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Creating…' : 'Confirm booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500 flex-shrink-0 w-28">{label}</span>
      <span className="font-medium text-gray-800 text-right capitalize">{value}</span>
    </div>
  );
}
