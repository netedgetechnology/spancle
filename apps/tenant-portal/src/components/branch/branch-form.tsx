'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { BranchTimingsEditor } from './branch-timings-editor';
import { generateSlug } from '@/lib/branch.api';
import {
  EMPTY_FORM,
  branchToFormValues,
  type Branch,
  type BranchFormValues,
  type BranchStatus,
  type WeeklyTimings,
} from '@/types/branch.types';

interface BranchFormProps {
  branch?:   Branch;
  onSave:    (values: Partial<BranchFormValues>) => void | Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

const STATUS_OPTIONS: { value: BranchStatus; label: string }[] = [
  { value: 'active',    label: 'Active'    },
  { value: 'inactive',  label: 'Inactive'  },
  { value: 'suspended', label: 'Suspended' },
  { value: 'archived',  label: 'Archived'  },
];

/**
 * BranchForm — create/edit form for a branch.
 *
 * Sections:
 *   1. Identity      — name, slug, description, status
 *   2. Address       — address lines, city, county, postcode, country
 *   3. Geo location  — latitude, longitude, geo label, map URL
 *   4. Contact       — phone, email, website
 *   5. Manager       — manager user ID (UUID input; Sprint 3: user selector)
 *   6. Opening hours — BranchTimingsEditor (7-day schedule)
 *   7. Display       — image URL, facilities, sort order
 */
export function BranchForm({
  branch,
  onSave,
  onCancel,
  isSaving = false,
}: BranchFormProps): React.ReactElement {
  const isEdit = !!branch;

  const [form, setForm]         = useState<BranchFormValues>(
    branch ? branchToFormValues(branch) : { ...EMPTY_FORM },
  );
  const [errors, setErrors]     = useState<Partial<Record<keyof BranchFormValues, string>>>({});
  const [slugDirty, setSlugDirty] = useState(isEdit);
  const [serverError, setServerError] = useState<string | null>(null);

  // Auto-generate slug in create mode
  useEffect(() => {
    if (!slugDirty && form.name) {
      setForm((f) => ({ ...f, slug: generateSlug(f.name) }));
    }
  }, [form.name, slugDirty]);

  const set = <K extends keyof BranchFormValues>(key: K, val: BranchFormValues[K]): void => {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validate = (): boolean => {
    const errs: typeof errors = {};

    if (!form.name.trim())         errs.name         = 'Branch name is required';
    if (!form.slug.trim())         errs.slug         = 'Slug is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug))
      errs.slug = 'Slug must be lowercase alphanumeric with hyphens';
    if (!form.addressLine1.trim()) errs.addressLine1 = 'Address is required';
    if (!form.city.trim())         errs.city         = 'City is required';
    if (!form.postcode.trim())     errs.postcode     = 'Postcode is required';

    // Geo validation
    if (form.latitude) {
      const n = parseFloat(form.latitude);
      if (isNaN(n) || n < -90 || n > 90) errs.latitude = 'Latitude must be between -90 and 90';
    }
    if (form.longitude) {
      const n = parseFloat(form.longitude);
      if (isNaN(n) || n < -180 || n > 180) errs.longitude = 'Longitude must be between -180 and 180';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;
    setServerError(null);
    try {
      await onSave(form);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Save failed. Please try again.');
    }
  };

  const input = (err?: string) => cn(
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
              Branch name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Manchester North"
              className={input(errors.name)}
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
              placeholder="manchester-north"
              className={cn(input(errors.slug), 'font-mono text-sm')}
            />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description of this branch…"
              className={cn(input(), 'resize-none')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as BranchStatus)}
              className={input()}
            >
              {STATUS_OPTIONS.map((o) => (
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
              className={input()}
            />
          </div>
        </div>
      </section>

      {/* ── 2. Address ────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Address</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Address line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={(e) => set('addressLine1', e.target.value)}
              placeholder="123 Sports Lane"
              className={input(errors.addressLine1)}
            />
            {errors.addressLine1 && <p className="mt-1 text-xs text-red-600">{errors.addressLine1}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Address line 2</label>
            <input
              type="text"
              value={form.addressLine2}
              onChange={(e) => set('addressLine2', e.target.value)}
              placeholder="Unit 4, Business Park"
              className={input()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => set('city', e.target.value)}
              placeholder="Manchester"
              className={input(errors.city)}
            />
            {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">County / State</label>
            <input
              type="text"
              value={form.county}
              onChange={(e) => set('county', e.target.value)}
              placeholder="Greater Manchester"
              className={input()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Postcode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.postcode}
              onChange={(e) => set('postcode', e.target.value.toUpperCase())}
              placeholder="M1 1AE"
              className={cn(input(errors.postcode), 'uppercase font-mono')}
            />
            {errors.postcode && <p className="mt-1 text-xs text-red-600">{errors.postcode}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Country code</label>
            <input
              type="text"
              maxLength={2}
              value={form.countryCode}
              onChange={(e) => set('countryCode', e.target.value.toUpperCase())}
              placeholder="GB"
              className={cn(input(), 'uppercase font-mono w-20')}
            />
          </div>
        </div>
      </section>

      {/* ── 3. Geo location ───────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
          Geo location
          <span className="ml-2 text-xs font-normal text-gray-400">(optional — used for maps)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Latitude</label>
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={form.latitude}
              onChange={(e) => set('latitude', e.target.value)}
              placeholder="53.4808"
              className={cn(input(errors.latitude), 'font-mono')}
            />
            {errors.latitude && <p className="mt-1 text-xs text-red-600">{errors.latitude}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Longitude</label>
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={form.longitude}
              onChange={(e) => set('longitude', e.target.value)}
              placeholder="-2.2426"
              className={cn(input(errors.longitude), 'font-mono')}
            />
            {errors.longitude && <p className="mt-1 text-xs text-red-600">{errors.longitude}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Geo label</label>
            <input
              type="text"
              value={form.geoLabel}
              onChange={(e) => set('geoLabel', e.target.value)}
              placeholder="what3words or plus code"
              className={input()}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Map URL</label>
            <input
              type="url"
              value={form.mapUrl}
              onChange={(e) => set('mapUrl', e.target.value)}
              placeholder="https://maps.google.com/…"
              className={input()}
            />
          </div>
        </div>
      </section>

      {/* ── 4. Contact ────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+44 161 000 0000"
              className={input()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="branch@example.com"
              className={input()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Website</label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => set('website', e.target.value)}
              placeholder="https://…"
              className={input()}
            />
          </div>
        </div>
      </section>

      {/* ── 5. Manager ────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
          Branch manager
          <span className="ml-2 text-xs font-normal text-gray-400">— Sprint 3: user picker</span>
        </h3>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Manager User ID
          </label>
          <input
            type="text"
            value={form.managerUserId}
            onChange={(e) => set('managerUserId', e.target.value)}
            placeholder="UUID of the user to assign as manager"
            className={cn(input(), 'font-mono text-sm')}
          />
          <p className="mt-1 text-xs text-gray-400">
            Must be an existing user in your organisation. Leave blank to unassign.
          </p>
        </div>
      </section>

      {/* ── 6. Opening hours ──────────────────────────────────────────────── */}
      <section>
        <BranchTimingsEditor
          value={form.timings}
          onChange={(t) => set('timings', t as WeeklyTimings)}
          disabled={isSaving}
        />
      </section>

      {/* ── 7. Display ────────────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Display</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Cover image URL</label>
            <input
              type="url"
              value={form.imageUrl}
              onChange={(e) => set('imageUrl', e.target.value)}
              placeholder="https://…/image.jpg"
              className={input()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Facilities
              <span className="ml-1 text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.facilities}
              onChange={(e) => set('facilities', e.target.value)}
              placeholder="parking, changing_rooms, cafe, wifi"
              className={input()}
            />
          </div>
        </div>
      </section>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isSaving}
          className="px-5 py-2 rounded-lg bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create branch'}
        </button>
      </div>
    </div>
  );
}
