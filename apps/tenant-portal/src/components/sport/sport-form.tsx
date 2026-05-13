'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { SportBranchPicker } from './sport-branch-picker';
import {
  EMPTY_FORM,
  SPORT_COLORS,
  SPORT_ICON_PRESETS,
  sportToFormValues,
  generateSlug,
  type Sport,
  type SportFormValues,
  type SportStatus,
} from '@/types/sport.types';

interface SportFormProps {
  sport?:    Sport;
  onSave:    (values: Partial<SportFormValues>) => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

const SPORT_STATUSES: { value: SportStatus; label: string }[] = [
  { value: 'active',   label: 'Active — visible and bookable'   },
  { value: 'inactive', label: 'Inactive — hidden from booking'  },
];

/**
 * SportForm — create/edit form for a sport.
 *
 * Sections:
 *   1. Identity     — name, slug, description, status
 *   2. Appearance   — icon (emoji preset picker + free entry), colour swatch picker
 *   3. Configuration — team size, player counts, session duration, age groups,
 *                      equipment, scoring system, notes
 *   4. Branch assignment — SportBranchPicker multi-select
 */
export function SportForm({
  sport,
  onSave,
  onCancel,
  isSaving = false,
}: SportFormProps): React.ReactElement {
  const isEdit = !!sport;

  const [form,       setForm]      = useState<SportFormValues>(
    sport ? sportToFormValues(sport) : { ...EMPTY_FORM },
  );
  const [errors,     setErrors]    = useState<Partial<Record<keyof SportFormValues, string>>>({});
  const [serverErr,  setServerErr] = useState<string | null>(null);
  const [slugDirty,  setSlugDirty] = useState(isEdit);

  // Auto-generate slug in create mode
  useEffect(() => {
    if (!slugDirty && form.name) {
      setForm((f) => ({ ...f, slug: generateSlug(f.name) }));
    }
  }, [form.name, slugDirty]);

  const set = <K extends keyof SportFormValues>(key: K, val: SportFormValues[K]): void => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.name.trim())   e.name = 'Sport name is required';
    if (!form.slug.trim())   e.slug = 'Slug is required';
    if (form.slug.trim() && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()))
      e.slug = 'Slug must be lowercase alphanumeric with hyphens only';
    if (form.color && !/^#[0-9a-fA-F]{6}$/.test(form.color))
      e.color = 'Colour must be a valid hex code (e.g. #3b82f6)';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;
    setServerErr(null);
    try {
      await onSave(form);
    } catch (err) {
      setServerErr(err instanceof Error ? err.message : 'Save failed. Please try again.');
    }
  };

  const inp = (err?: string) => cn(
    'block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
    err ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
        : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
  );

  return (
    <div className="flex flex-col gap-8">
      {serverErr && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {serverErr}
        </div>
      )}

      {/* ── 1. Identity ───────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Sport name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="5-a-side Football"
              className={inp(errors.name)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => { setSlugDirty(true); set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-')); }}
              placeholder="5-a-side-football"
              className={cn(inp(errors.slug), 'font-mono')}
            />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description of this sport or activity…"
              className={cn(inp(), 'resize-none')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as SportStatus)}
              className={inp()}
            >
              {SPORT_STATUSES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Sort order</label>
            <input
              type="number"
              min={0}
              value={form.sortOrder}
              onChange={(e) => set('sortOrder', Number(e.target.value))}
              className={inp()}
            />
          </div>
        </div>
      </section>

      {/* ── 2. Appearance ─────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Appearance</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Icon */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Icon</label>
            {/* Preset grid */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {SPORT_ICON_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  title={preset.label}
                  onClick={() => set('icon', preset.value)}
                  className={cn(
                    'flex h-10 w-full items-center justify-center rounded-lg border text-xl transition-all',
                    form.icon === preset.value
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {preset.value}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={form.icon}
              onChange={(e) => set('icon', e.target.value)}
              placeholder="Custom emoji or icon identifier"
              className={cn(inp(), 'font-mono text-base')}
            />
          </div>

          {/* Colour */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Colour</label>
            {/* Swatch grid */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {SPORT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => set('color', c.value)}
                  className={cn(
                    'h-10 w-full rounded-lg border-2 transition-all',
                    form.color === c.value
                      ? 'border-gray-800 scale-105 shadow-md'
                      : 'border-transparent hover:border-gray-300',
                  )}
                  style={{ backgroundColor: c.value }}
                  aria-label={c.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={form.color || '#3b82f6'}
                onChange={(e) => set('color', e.target.value)}
                className="h-9 w-9 rounded-md border border-gray-300 cursor-pointer p-0.5"
                title="Custom colour"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => set('color', e.target.value)}
                placeholder="#3b82f6"
                className={cn(inp(errors.color), 'font-mono flex-1')}
                maxLength={7}
              />
            </div>
            {errors.color && <p className="mt-1 text-xs text-red-600">{errors.color}</p>}

            {/* Live preview */}
            {(form.icon || form.name) && (
              <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base flex-shrink-0"
                  style={{ backgroundColor: (form.color || '#3b82f6') + '22' }}
                >
                  {form.icon || '🏅'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: form.color || '#3b82f6' }} aria-hidden="true" />
                    <p className="text-sm font-medium text-gray-800">{form.name || 'Sport name'}</p>
                  </div>
                  <p className="text-xs font-mono text-gray-400">{form.slug || 'slug'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3. Configuration ──────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
          Configuration
          <span className="ml-2 text-xs font-normal text-gray-400">optional sport-specific settings</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Team size</label>
            <input type="number" min={1} value={form.teamSize} onChange={(e) => set('teamSize', e.target.value)} placeholder="11" className={inp()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Min players</label>
            <input type="number" min={1} value={form.minPlayers} onChange={(e) => set('minPlayers', e.target.value)} placeholder="6" className={inp()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Max players</label>
            <input type="number" min={1} value={form.maxPlayers} onChange={(e) => set('maxPlayers', e.target.value)} placeholder="22" className={inp()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Session duration (min)</label>
            <input type="number" min={1} value={form.sessionDurationMins} onChange={(e) => set('sessionDurationMins', e.target.value)} placeholder="90" className={inp()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Scoring system</label>
            <input type="text" value={form.scoringSystem} onChange={(e) => set('scoringSystem', e.target.value)} placeholder="goals, sets, points…" className={inp()} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Age groups
              <span className="ml-1 text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input type="text" value={form.ageGroups} onChange={(e) => set('ageGroups', e.target.value)} placeholder="under-8, under-10, adult" className={inp()} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Equipment required
              <span className="ml-1 text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input type="text" value={form.equipment} onChange={(e) => set('equipment', e.target.value)} placeholder="football boots, shin pads, mouthguard" className={inp()} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea rows={2} value={form.configNotes} onChange={(e) => set('configNotes', e.target.value)} placeholder="Any additional configuration notes…" className={cn(inp(), 'resize-none')} />
          </div>
        </div>
      </section>

      {/* ── 4. Branch assignment ──────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
          Branch availability
        </h3>
        <SportBranchPicker
          selectedIds={form.branchIds}
          onChange={(ids) => set('branchIds', ids)}
          disabled={isSaving}
        />
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
          {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create sport'}
        </button>
      </div>
    </div>
  );
}
