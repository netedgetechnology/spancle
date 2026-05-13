'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { FeatureToggles }  from './feature-toggles';
import { LimitsEditor }    from './limits-editor';
import type { Package, PackageFormValues, PackageFeatures, PackageLimits } from '@/types/packages.types';
import { TIER_ORDER } from '@/types/packages.types';

const DEFAULT_FEATURES: PackageFeatures = {
  customBranding: false, advancedAnalytics: false, apiAccess: false,
  webhooks: false, multiAcademy: false, prioritySupport: false,
  auditLogAccess: false, customRoles: false, dataExport: false, ssoIntegration: false,
};

const DEFAULT_LIMITS: PackageLimits = {
  maxUsers: 5, maxStorageGb: 1, maxApiCallsPerDay: 1000, maxConcurrentBookings: 10,
  maxActiveTournaments: 1, maxAcademies: 1, maxPlayersPerAcademy: 25,
  maxNotificationsPerDay: 50, maxReportsPerDay: 2,
};

interface PackageFormProps {
  pkg?:      Package;
  onSave:    (values: Partial<PackageFormValues>) => Promise<void>;
  onCancel?: () => void;
  isSaving?: boolean;
}

/**
 * PackageForm — full create/edit form for a SaaS package.
 *
 * Sections:
 *   1. Identity      — name, slug, tierKey, description
 *   2. Pricing       — monthly price, annual price, currency, trial days
 *   3. Feature Flags — 10 boolean toggles
 *   4. Limits        — 9 resource limit inputs with unlimited toggle
 *   5. Display       — highlight features, badge, isHighlighted, sortOrder
 */
export function PackageForm({ pkg, onSave, onCancel, isSaving = false }: PackageFormProps): React.ReactElement {
  const isEdit = !!pkg;

  const [name,        setName]        = useState(pkg?.name            ?? '');
  const [slug,        setSlug]        = useState(pkg?.slug            ?? '');
  const [tierKey,     setTierKey]     = useState(pkg?.tierKey         ?? 'starter');
  const [description, setDescription] = useState(pkg?.description    ?? '');
  const [priceM,      setPriceM]      = useState(pkg?.priceMonthlyMinorUnits ?? 0);
  const [priceA,      setPriceA]      = useState(pkg?.priceAnnualMinorUnits  ?? 0);
  const [currency,    setCurrency]    = useState(pkg?.currency        ?? 'GBP');
  const [trialDays,   setTrialDays]   = useState(pkg?.trialDays       ?? 14);
  const [features,    setFeatures]    = useState<PackageFeatures>({ ...DEFAULT_FEATURES, ...(pkg?.features ?? {}) });
  const [limits,      setLimits]      = useState<PackageLimits>({ ...DEFAULT_LIMITS, ...(pkg?.limits ?? {}) });
  const [highlights,  setHighlights]  = useState((pkg?.highlightFeatures ?? []).join('\n'));
  const [badgeText,   setBadgeText]   = useState(pkg?.badgeText       ?? '');
  const [highlighted, setHighlighted] = useState(pkg?.isHighlighted   ?? false);
  const [sortOrder,   setSortOrder]   = useState(pkg?.sortOrder       ?? 0);
  const [errors,      setErrors]      = useState<Record<string, string>>({});

  // Auto-generate slug from name in create mode
  useEffect(() => {
    if (!isEdit && name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
    }
  }, [name, isEdit]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim())                 errs['name'] = 'Name is required';
    if (!slug.trim())                 errs['slug'] = 'Slug is required';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) errs['slug'] = 'Lowercase alphanumeric + hyphens only';
    if (!tierKey)                     errs['tierKey'] = 'Tier is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validate()) return;
    await onSave({
      name: name.trim(), slug: slug.trim(), description: description.trim() || undefined,
      tierKey, priceMonthlyMinorUnits: priceM, priceAnnualMinorUnits: priceA,
      currency, trialDays, features, limits,
      highlightFeatures: highlights.split('\n').map(s => s.trim()).filter(Boolean),
      badgeText: badgeText.trim() || undefined,
      isHighlighted: highlighted, sortOrder,
    });
  };

  const inputClass = (err?: string) => cn(
    'block w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200',
    err ? 'border-red-400 focus:border-red-500' : 'border-gray-300 focus:border-primary-500',
  );

  return (
    <div className="flex flex-col gap-8">

      {/* Section 1: Identity */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Identity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
            <input className={inputClass(errors['name'])} value={name} onChange={e => setName(e.target.value)} placeholder="Pro Plan" />
            {errors['name'] && <p className="text-xs text-red-600 mt-1">{errors['name']}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Slug *</label>
            <input className={cn(inputClass(errors['slug']), 'font-mono')} value={slug}
              onChange={e => setSlug(e.target.value)} placeholder="pro" />
            {errors['slug'] && <p className="text-xs text-red-600 mt-1">{errors['slug']}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tier Key *</label>
            <select className={inputClass(errors['tierKey'])} value={tierKey} onChange={e => setTierKey(e.target.value)}>
              {TIER_ORDER.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors['tierKey'] && <p className="text-xs text-red-600 mt-1">{errors['tierKey']}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input className={inputClass()} value={description} onChange={e => setDescription(e.target.value)} placeholder="Short marketing description" />
          </div>
        </div>
      </section>

      {/* Section 2: Pricing */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Pricing</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monthly (minor units)</label>
            <input type="number" min="0" className={inputClass()} value={priceM}
              onChange={e => setPriceM(Number(e.target.value))} />
            <p className="text-[10px] text-gray-400 mt-0.5">{priceM === 0 ? 'Free' : `${(priceM/100).toFixed(2)} ${currency}`}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Annual (minor units)</label>
            <input type="number" min="0" className={inputClass()} value={priceA}
              onChange={e => setPriceA(Number(e.target.value))} />
            <p className="text-[10px] text-gray-400 mt-0.5">{priceA === 0 ? 'Free' : `${(priceA/100).toFixed(2)} ${currency}`}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Currency</label>
            <select className={inputClass()} value={currency} onChange={e => setCurrency(e.target.value)}>
              {['GBP', 'USD', 'EUR'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Trial days</label>
            <input type="number" min="0" max="365" className={inputClass()} value={trialDays}
              onChange={e => setTrialDays(Number(e.target.value))} />
          </div>
        </div>
      </section>

      {/* Section 3: Feature Flags */}
      <section>
        <FeatureToggles value={features} onChange={v => setFeatures(v as PackageFeatures)} />
      </section>

      {/* Section 4: Limits */}
      <section>
        <LimitsEditor value={limits} onChange={v => setLimits(v as PackageLimits)} />
      </section>

      {/* Section 5: Display */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">Display</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Highlight bullets (one per line, max 6)</label>
            <textarea rows={4} className={inputClass()} value={highlights}
              onChange={e => setHighlights(e.target.value)} placeholder="Unlimited users&#10;24/7 support&#10;SSO integration" />
          </div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Badge text</label>
              <input className={inputClass()} value={badgeText} onChange={e => setBadgeText(e.target.value)} placeholder="Most Popular" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sort order</label>
              <input type="number" min="0" className={inputClass()} value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={highlighted} onChange={e => setHighlighted(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
              <span className="text-sm text-gray-700">Highlight in pricing grid</span>
            </label>
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
          className="px-5 py-2 rounded-lg bg-primary-600 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50">
          {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create package'}
        </button>
      </div>
    </div>
  );
}
