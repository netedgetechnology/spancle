'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils/cn';
import { BranchTimingsEditor }   from '@/components/branch/branch-timings-editor';
import { fetchRateCards, rateCardKeys } from '@/lib/rate-card.api';
import { fetchBranches, branchKeys } from '@/lib/branch.api';
import { fetchSports,   sportKeys }  from '@/lib/sport.api';
import { DEFAULT_TIMINGS, type WeeklyTimings } from '@/types/branch.types';
import {
  SURFACE_TYPE_OPTIONS,
  COURT_STATUS_CONFIG,
  EMPTY_COURT_FORM,
  courtToFormValues,
  type Court,
  type CourtFormValues,
  type CourtType,
  type SurfaceType,
  type CourtStatus,
} from '@/types/court.types';

interface CourtFormProps {
  court?:    Court;
  defaultBranchId?: string;
  onSave:    (values: Partial<CourtFormValues>) => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

/**
 * CourtForm — create/edit form for a court.
 *
 * Sections:
 *   1. Identity         — branch, sport, name, code, description, status
 *   2. Physical         — indoor/outdoor, surface, capacity, concurrent bookings, dimensions
 *   3. Operating hours  — BranchTimingsEditor (re-used from branch module)
 *   4. Display          — image URL, amenities, hourly rate, sort order
 */
export function CourtForm({
  court,
  defaultBranchId,
  onSave,
  onCancel,
  isSaving = false,
}: CourtFormProps): React.ReactElement {
  const isEdit = !!court;

  const { data: rateCardsData } = useQuery({
    queryKey: rateCardKeys.list({ isActive: true }),
    queryFn:  () => fetchRateCards({ isActive: true }),
  });
  const rateCards = rateCardsData?.data ?? [];

  const [form, setForm] = useState<CourtFormValues>(
    court
      ? courtToFormValues(court)
      : { ...EMPTY_COURT_FORM, branchId: defaultBranchId ?? '' },
  );
  const [useCustomHours, setUseCustomHours] = useState(!!court?.operatingHours);
  const [errors, setErrors] = useState<Partial<Record<keyof CourtFormValues, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: branches = [] } = useQuery({
    queryKey: branchKeys.list(),
    queryFn:  () => fetchBranches(),
  });

  const { data: sports = [] } = useQuery({
    queryKey: sportKeys.list(),
    queryFn:  () => fetchSports(),
  });

  const set = <K extends keyof CourtFormValues>(key: K, val: CourtFormValues[K]): void => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.branchId)     e.branchId = 'Branch is required';
    if (!form.name.trim())  e.name     = 'Court name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;
    setServerError(null);
    try {
      const values: Partial<CourtFormValues> = {
        ...form,
        operatingHours: useCustomHours ? (form.operatingHours ?? DEFAULT_TIMINGS) : null,
      };
      await onSave(values);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Save failed. Please try again.');
    }
  };

  const inp = (err?: string) => cn(
    'block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
    err ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
  );

  return (
    <div className="flex flex-col gap-8">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {serverError}
        </div>
      )}

      {/* ── 1. Identity ───────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Branch <span className="text-red-500">*</span>
            </label>
            <select
              value={form.branchId}
              onChange={(e) => set('branchId', e.target.value)}
              disabled={isEdit}
              className={cn(inp(errors.branchId), isEdit && 'bg-gray-50 opacity-75')}
            >
              <option value="">Select branch…</option>
              {branches.filter((b) => b.status !== 'archived').map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            {errors.branchId && <p className="mt-1 text-xs text-red-600">{errors.branchId}</p>}
            {isEdit && <p className="mt-1 text-xs text-gray-400">Branch cannot be changed after creation</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Primary sport</label>
            <select value={form.sportId} onChange={(e) => set('sportId', e.target.value)} className={inp()}>
              <option value="">Multi-sport / none</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.icon ? `${s.icon} ` : ''}{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Court 1"
              className={inp(errors.name)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Short code
              <span className="ml-1 text-gray-400 font-normal">(for calendars)</span>
            </label>
            <input
              type="text"
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="C1"
              maxLength={20}
              className={cn(inp(), 'font-mono')}
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional description…"
              className={cn(inp(), 'resize-none')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as CourtStatus)}
              className={inp()}
            >
              {(Object.keys(COURT_STATUS_CONFIG) as CourtStatus[]).map((s) => (
                <option key={s} value={s}>{COURT_STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Sort order</label>
            <input
              type="number" min={0}
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              className={inp()}
            />
          </div>
        </div>
      </section>

      {/* ── 2. Physical ───────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Physical attributes</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Type</label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              {(['indoor', 'outdoor'] as CourtType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('courtType', t)}
                  className={cn(
                    'flex-1 py-2.5 text-sm font-medium transition-colors capitalize',
                    form.courtType === t
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {t === 'indoor' ? '🏢' : '🌳'} {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Surface type</label>
            <select
              value={form.surfaceType}
              onChange={(e) => set('surfaceType', e.target.value as SurfaceType)}
              className={inp()}
            >
              {SURFACE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Capacity (players)</label>
            <input
              type="number" min={1}
              value={form.capacity}
              onChange={(e) => set('capacity', e.target.value)}
              placeholder="e.g. 22"
              className={inp()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Concurrent bookings
              <span className="ml-1 text-gray-400 font-normal">(usually 1)</span>
            </label>
            <input
              type="number" min={1} max={10}
              value={form.maxBookingsConcurrent}
              onChange={(e) => set('maxBookingsConcurrent', e.target.value)}
              className={inp()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Dimensions</label>
            <input
              type="text"
              value={form.dimensions}
              onChange={(e) => set('dimensions', e.target.value)}
              placeholder="68m × 105m"
              maxLength={50}
              className={inp()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Hourly rate (minor units)</label>
            <input
              type="number" min={0}
              value={form.hourlyRateMinor}
              onChange={(e) => set('hourlyRateMinor', e.target.value)}
              placeholder="e.g. 3500 = £35"
              className={inp()}
            />
            {form.hourlyRateMinor && !isNaN(Number(form.hourlyRateMinor)) && (
              <p className="mt-1 text-xs text-gray-400">
                = {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(Number(form.hourlyRateMinor) / 100)}/hr
              </p>
            )}
          </div>

          {/* Rate Card assignment */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Rate Card</label>
            <select
              value={form.rateCardId}
              onChange={(e) => set('rateCardId', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 bg-white"
            >
              <option value="">No rate card (use hourly rate above)</option>
              {rateCards.map((rc) => (
                <option key={rc.id} value={rc.id}>
                  {rc.name} ({rc.currency})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              When assigned, Rate Card pricing overrides the hourly rate for this court
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Operating hours ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Operating hours</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {useCustomHours
                ? 'Custom hours override the parent branch schedule for this court'
                : 'Using parent branch hours — enable custom hours to override'}
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-600">Custom hours</span>
            <button
              type="button"
              role="switch"
              aria-checked={useCustomHours}
              onClick={() => {
                setUseCustomHours((v) => !v);
                if (!form.operatingHours) {
                  set('operatingHours', DEFAULT_TIMINGS);
                }
              }}
              className={cn(
                'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                useCustomHours ? 'bg-primary-600' : 'bg-gray-200',
              )}
            >
              <span className={cn(
                'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow mt-[3px] transition-transform',
                useCustomHours ? 'translate-x-[18px]' : 'translate-x-0.5',
              )} />
            </button>
          </label>
        </div>

        {useCustomHours && (
          <BranchTimingsEditor
            value={form.operatingHours ?? DEFAULT_TIMINGS}
            onChange={(t) => set('operatingHours', t as WeeklyTimings)}
            disabled={isSaving}
          />
        )}
      </section>

      {/* ── 4. Display ────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Display</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Cover image URL</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://…/court.jpg"
              className={inp()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Amenities
              <span className="ml-1 text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.amenities}
              onChange={(e) => set('amenities', e.target.value)}
              placeholder="floodlights, changing_rooms, parking"
              className={inp()}
            />
          </div>
        </div>
      </section>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
        )}
        <button type="button" onClick={() => void handleSubmit()} disabled={isSaving}
          className="px-5 py-2 rounded-lg bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
          {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create court'}
        </button>
      </div>
    </div>
  );
}
