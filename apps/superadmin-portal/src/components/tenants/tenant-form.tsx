'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  createTenant, updateTenant, changeTenantTier, tenantKeys,
  checkSlugAvailable, parseBackendErrors,
} from '@/lib/tenants.api';
import { cn } from '@/lib/utils/cn';
import type { TenantDetail, CreateTenantFormData } from '@/types/tenant-detail.types';
import {
  DEFAULT_MODULES, DEFAULT_COMMISSION, DEFAULT_INVOICE,
  DEFAULT_RAZORPAY, DEFAULT_PAYOUT, DEFAULT_THEME,
  TIMEZONES, CURRENCIES, COUNTRIES, SETTLEMENT_LABELS, TIER_LABELS,
  RESERVED_SLUGS,
} from '@/types/tenant-detail.types';
import type { TenantTier } from '@/types/admin.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PHONE_RE = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{3,6}[-\s.]?[0-9]{3,6}$/;
const SLUG_RE  = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, description, badge, children }: {
  title: string; description?: string; badge?: string; children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
        </div>
        {badge && (
          <span className="flex-shrink-0 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">{badge}</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, required, hint, error, children, full }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode; full?: boolean;
}): React.ReactElement {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {!required && <span className="ml-1 text-gray-400 font-normal">(optional)</span>}
      </label>
      {children}
      {error  && <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><span>⚠</span>{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const inputCls = (err?: string) => cn(
  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors',
  err
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
);

const selectCls = (err?: string) => cn(
  'w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors bg-white',
  err
    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
);

function Toggle({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean;
}): React.ReactElement {
  return (
    <label className={cn('flex items-start gap-3 cursor-pointer group', disabled && 'opacity-50 cursor-not-allowed')}>
      <span className={cn('relative mt-0.5 flex-shrink-0 h-5 w-9 rounded-full transition-colors duration-200', checked && !disabled ? 'bg-blue-600' : 'bg-gray-200')}>
        <span className={cn('absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200', checked && !disabled ? 'translate-x-4' : 'translate-x-0')} />
        <input type="checkbox" checked={checked} onChange={(e) => !disabled && onChange(e.target.checked)} className="sr-only" aria-label={label} disabled={disabled} />
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {description && <span className="block text-xs text-gray-400 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

interface TenantFormProps { mode: 'create' | 'edit'; tenant?: TenantDetail; }

export function TenantForm({ mode, tenant }: TenantFormProps): React.ReactElement {
  const router = useRouter();
  const qc     = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<CreateTenantFormData & { ownerName: string }>({
    name:       tenant?.name  ?? '',
    slug:       tenant?.slug  ?? '',
    ownerName:  (tenant?.settings as any)?.ownerName ?? '',
    email:      tenant?.email ?? '',
    phone:      tenant?.phone ?? '',
    tier:       (tenant?.tier ?? 'free') as TenantTier,
    region:     (tenant as any)?.region   ?? 'IN',
    timezone:   tenant?.settings?.timezone ?? 'Asia/Kolkata',
    currency:   tenant?.settings?.currency ?? 'INR',
    modules:    (tenant as any)?.modules   ?? { ...DEFAULT_MODULES },
    commission: (tenant as any)?.commission ?? { ...DEFAULT_COMMISSION },
    invoice:    (tenant as any)?.invoice    ?? { ...DEFAULT_INVOICE },
    theme:      (tenant as any)?.theme      ?? { ...DEFAULT_THEME },
    razorpay:   (tenant as any)?.razorpay   ?? { ...DEFAULT_RAZORPAY },
    payout:     (tenant as any)?.payout     ?? { ...DEFAULT_PAYOUT },
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [slugDirty, setSlugDirty] = useState(false);

  // Auto-slug from name in create mode
  useEffect(() => {
    if (!isEdit && !slugDirty && form.name) {
      const auto = form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63);
      setForm((f) => ({ ...f, slug: auto }));
    }
  }, [form.name, isEdit, slugDirty]);

  // Slug availability check
  const { data: slugCheck, isFetching: slugChecking } = useQuery({
    queryKey: tenantKeys.slugAvailable(form.slug),
    queryFn:  () => checkSlugAvailable(form.slug),
    enabled:  !isEdit && form.slug.length >= 2 && SLUG_RE.test(form.slug) && !RESERVED_SLUGS.has(form.slug),
    staleTime: 5_000,
  });

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
    setFieldErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  };

  const setNested = (key: keyof typeof form, field: string, val: unknown) =>
    setForm((f) => ({ ...f, [key]: { ...(f[key] as object), [field]: val } }));

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const e: Record<string, string> = {};

    if (!form.name.trim())      e['name'] = 'Organisation name is required.';
    else if (form.name.trim().length < 2) e['name'] = 'Name must be at least 2 characters.';

    if (!form.ownerName.trim()) e['ownerName'] = 'Owner name is required.';

    if (!form.email.trim())     e['email'] = 'Owner email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e['email'] = 'Enter a valid email address.';

    if (form.phone && !PHONE_RE.test(form.phone.replace(/\s/g, '')))
      e['phone'] = 'Enter a valid mobile number (e.g. +91 98765 43210).';

    if (!form.slug.trim())      e['slug'] = 'Subdomain is required.';
    else if (form.slug.length < 2) e['slug'] = 'Subdomain must be at least 2 characters.';
    else if (!SLUG_RE.test(form.slug)) e['slug'] = 'Lowercase letters, numbers and hyphens only. Cannot start or end with a hyphen.';
    else if (RESERVED_SLUGS.has(form.slug)) e['slug'] = `"${form.slug}" is a reserved name and cannot be used.`;
    else if (!isEdit && slugCheck?.available === false) e['slug'] = 'This subdomain is already taken. Choose another.';

    if (!form.region)   e['region']   = 'Country is required.';
    if (!form.timezone) e['timezone'] = 'Timezone is required.';
    if (!form.currency) e['currency'] = 'Currency is required.';

    const anyModule = Object.values(form.modules).some(Boolean);
    if (!anyModule) e['modules'] = 'At least one module must be enabled.';

    if (form.invoice.gstEnabled && form.invoice.gstin) {
      if (!GSTIN_RE.test(form.invoice.gstin)) e['gstin'] = 'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5).';
    }

    setFieldErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Mutation ────────────────────────────────────────────────────────────────

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit && tenant) {
        if (form.tier !== tenant.tier) await changeTenantTier(tenant.id, form.tier);
        return updateTenant(tenant.id, { ...form, ownerName: form.ownerName } as any);
      }
      return createTenant({ ...form, ownerName: form.ownerName } as any);
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: tenantKeys.all() });
      setSuccessMsg(isEdit ? 'Tenant updated successfully.' : 'Tenant created successfully.');
      setTimeout(() => router.push(`/tenants/${saved.id}`), 1000);
    },
    onError: (err: unknown) => {
      const parsed = parseBackendErrors(err);
      const { _general, ...fields } = parsed;
      if (Object.keys(fields).length > 0) setFieldErrors((e) => ({ ...e, ...fields }));
      setGeneralError(_general ?? 'Something went wrong. Please check the form and try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSuccessMsg(null);
    if (validate()) saveMutation.mutate();
  };

  // ── Slug status indicator ────────────────────────────────────────────────────

  const slugOk = !isEdit && form.slug.length >= 2 && SLUG_RE.test(form.slug)
    && !RESERVED_SLUGS.has(form.slug) && !fieldErrors['slug'] && slugCheck?.available === true;
  const slugBad = !!fieldErrors['slug'] || (!isEdit && slugCheck?.available === false);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">

      {/* Success */}
      {successMsg && (
        <div role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          {successMsg}
        </div>
      )}

      {/* General error */}
      {generalError && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          {generalError}
        </div>
      )}

      {/* ── Core details ── */}
      <Section title="Organisation details" description="Required: name, subdomain, owner identity.">
        <Field label="Organisation name" required error={fieldErrors['name']}>
          <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
            className={inputCls(fieldErrors['name'])} placeholder="Ace Sports Club" autoFocus />
        </Field>

        <Field label="Subdomain" required
          error={fieldErrors['slug']}
          hint={!fieldErrors['slug'] ? (isEdit ? 'Cannot be changed after creation.' : undefined) : undefined}>
          <div className="flex flex-col gap-1">
            <div className="flex">
              <input
                type="text" value={form.slug}
                onChange={(e) => {
                  setSlugDirty(true);
                  const v = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  set('slug', v);
                }}
                className={cn(inputCls(slugBad ? fieldErrors['slug'] : undefined), 'rounded-r-none')}
                placeholder="acesports" maxLength={63} disabled={isEdit} readOnly={isEdit}
              />
              <span className="flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-500 whitespace-nowrap select-none">
                .spancle.com
              </span>
            </div>
            {/* Slug availability indicator */}
            {!isEdit && form.slug.length >= 2 && SLUG_RE.test(form.slug) && !RESERVED_SLUGS.has(form.slug) && (
              <div className="flex items-center gap-1.5 text-xs">
                {slugChecking && <span className="text-gray-400">Checking availability…</span>}
                {!slugChecking && slugOk && (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    <strong>https://{form.slug}.spancle.com</strong> is available
                  </span>
                )}
                {!slugChecking && slugCheck?.available === false && !fieldErrors['slug'] && (
                  <span className="text-red-600">This subdomain is already taken.</span>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field label="Owner full name" required error={fieldErrors['ownerName']}>
          <input type="text" value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)}
            className={inputCls(fieldErrors['ownerName'])} placeholder="Rajesh Nair" />
        </Field>

        <Field label="Owner email" required error={fieldErrors['email']}>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            className={inputCls(fieldErrors['email'])} placeholder="admin@acesports.in" />
        </Field>

        <Field label="Owner mobile" error={fieldErrors['phone']} hint="Include country code, e.g. +91 98765 43210">
          <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
            className={inputCls(fieldErrors['phone'])} placeholder="+91 98765 43210" />
        </Field>

        <Field label="Subscription tier" required>
          <select value={form.tier} onChange={(e) => set('tier', e.target.value as TenantTier)} className={selectCls()}>
            {(Object.entries(TIER_LABELS) as [TenantTier, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* ── Region / locale ── */}
      <Section title="Region & locale" description="Required: determines currency, timezone and tax treatment.">
        <Field label="Country" required error={fieldErrors['region']}>
          <select value={form.region} onChange={(e) => set('region', e.target.value)} className={selectCls(fieldErrors['region'])}>
            <option value="">Select country…</option>
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Timezone" required error={fieldErrors['timezone']}>
          <select value={form.timezone} onChange={(e) => set('timezone', e.target.value)} className={selectCls(fieldErrors['timezone'])}>
            {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Currency" required error={fieldErrors['currency']}>
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={selectCls(fieldErrors['currency'])}>
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </Section>

      {/* ── Modules ── */}
      <Section title="Enabled modules" description="Required: at least one module must be enabled.">
        {fieldErrors['modules'] && (
          <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
            {fieldErrors['modules']}
          </div>
        )}
        <div className="sm:col-span-2 flex flex-col gap-5">
          <Toggle checked={form.modules.booking} onChange={(v) => setNested('modules', 'booking', v)}
            label="Booking module" description={`Members book courts at ${form.slug || '{slug}'}.spancle.com/booking`} />
          <Toggle checked={form.modules.reporting} onChange={(v) => setNested('modules', 'reporting', v)}
            label="Reports module" description="Revenue, occupancy and membership analytics." />
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Future modules (not yet available)</p>
            <div className="flex flex-col gap-3">
              <Toggle checked={false} onChange={() => {}} disabled label="Tournament module" description="Brackets and fixtures at {slug}.spancle.com/tournament" />
              <Toggle checked={false} onChange={() => {}} disabled label="Academy module" description="Coaching programmes and player tracking." />
              <Toggle checked={false} onChange={() => {}} disabled label="Communication module" description="WhatsApp, email and push notifications." />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Commission ── */}
      <Section title="Booking commission" description="Platform fee deducted per booking before tenant payout.">
        <Field label="Commission type" required>
          <select value={form.commission.type} onChange={(e) => setNested('commission', 'type', e.target.value)} className={selectCls()}>
            <option value="percentage">Percentage of booking value</option>
            <option value="fixed_per_booking">Fixed amount per booking</option>
          </select>
        </Field>
        <Field label={form.commission.type === 'percentage' ? 'Commission %' : 'Fixed amount (minor units)'}
          required hint={form.commission.type === 'percentage' ? 'E.g. 5 for 5%' : 'In paise for INR — 5000 = ₹50'}>
          <input type="number" min={0} step={form.commission.type === 'percentage' ? 0.1 : 1}
            value={form.commission.value} onChange={(e) => setNested('commission', 'value', Number(e.target.value))} className={inputCls()} />
        </Field>
        <Field label="Settlement cycle" required hint="How often Spancle settles with the tenant.">
          <select value={form.commission.settlementCycle} onChange={(e) => setNested('commission', 'settlementCycle', e.target.value)} className={selectCls()}>
            {(Object.entries(SETTLEMENT_LABELS) as [string,string][]).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
      </Section>

      {/* ── GST / Invoice ── */}
      <Section title="Invoice & GST" description="Controls invoice generation and tax calculation.">
        <div className="sm:col-span-2">
          <Toggle checked={form.invoice.gstEnabled} onChange={(v) => setNested('invoice', 'gstEnabled', v)}
            label="GST-enabled tenant" description="Auto-calculate CGST/SGST or IGST on all invoices." />
        </div>
        {form.invoice.gstEnabled && (
          <>
            <Field label="GSTIN" error={fieldErrors['gstin']} hint="15-character GST number.">
              <input type="text" value={form.invoice.gstin ?? ''} maxLength={15}
                onChange={(e) => setNested('invoice', 'gstin', e.target.value.toUpperCase())}
                className={inputCls(fieldErrors['gstin'])} placeholder="29ABCDE1234F1Z5" />
            </Field>
            <Field label="Legal / registered name">
              <input type="text" value={form.invoice.legalName ?? ''} onChange={(e) => setNested('invoice', 'legalName', e.target.value)} className={inputCls()} placeholder="Ace Sports Club Pvt Ltd" />
            </Field>
            <Field label="State code" hint="2-digit, e.g. 29 for Karnataka.">
              <input type="text" value={form.invoice.gstState ?? ''} maxLength={2} onChange={(e) => setNested('invoice', 'gstState', e.target.value)} className={inputCls()} placeholder="29" />
            </Field>
            <Field label="HSN / SAC code" hint="Default 999335 for sports & recreation.">
              <input type="text" value={form.invoice.hsnSacCode ?? '999335'} onChange={(e) => setNested('invoice', 'hsnSacCode', e.target.value)} className={inputCls()} />
            </Field>
          </>
        )}
      </Section>

      {/* ── Razorpay [placeholder] ── */}
      <Section title="Payment gateway — Razorpay" description="Gateway config — full integration in Sprint 3." badge="Placeholder">
        <div className="sm:col-span-2">
          <Toggle checked={form.razorpay.enabled} onChange={(v) => setNested('razorpay', 'enabled', v)}
            label="Enable Razorpay for this tenant" description="Full integration coming in Sprint 3." />
        </div>
        {form.razorpay.enabled && (
          <Field label="Razorpay account ID" full hint="Linked account ID for split payments.">
            <input type="text" value={form.razorpay.accountId ?? ''} onChange={(e) => setNested('razorpay', 'accountId', e.target.value)} className={inputCls()} placeholder="acc_XXXXXXXXXXXXXXXX" />
          </Field>
        )}
        <Field label="Internal notes" full>
          <input type="text" value={form.razorpay.notes ?? ''} onChange={(e) => setNested('razorpay', 'notes', e.target.value)} className={inputCls()} placeholder="Internal notes about gateway setup" />
        </Field>
      </Section>

      {/* ── Payout [placeholder] ── */}
      <Section title="Payout / bank details" description="Bank account for settlement — Sprint 3." badge="Placeholder">
        <Field label="Payout method">
          <select value={form.payout.preferredMethod ?? 'bank'} onChange={(e) => setNested('payout', 'preferredMethod', e.target.value)} className={selectCls()}>
            <option value="bank">Bank transfer (NEFT/IMPS)</option>
            <option value="upi">UPI</option>
          </select>
        </Field>
        {form.payout.preferredMethod !== 'upi' && (
          <>
            <Field label="Bank name"><input type="text" value={form.payout.bankName ?? ''} onChange={(e) => setNested('payout', 'bankName', e.target.value)} className={inputCls()} placeholder="HDFC Bank" /></Field>
            <Field label="Account holder"><input type="text" value={form.payout.accountHolder ?? ''} onChange={(e) => setNested('payout', 'accountHolder', e.target.value)} className={inputCls()} /></Field>
            <Field label="Account number" hint="Not displayed after save."><input type="password" value={form.payout.accountNumber ?? ''} onChange={(e) => setNested('payout', 'accountNumber', e.target.value)} className={inputCls()} autoComplete="off" /></Field>
            <Field label="IFSC code"><input type="text" value={form.payout.ifscCode ?? ''} onChange={(e) => setNested('payout', 'ifscCode', e.target.value.toUpperCase())} className={inputCls()} placeholder="HDFC0001234" /></Field>
          </>
        )}
        {form.payout.preferredMethod === 'upi' && (
          <Field label="UPI ID" full><input type="text" value={form.payout.upiId ?? ''} onChange={(e) => setNested('payout', 'upiId', e.target.value)} className={inputCls()} placeholder="acesports@hdfc" /></Field>
        )}
      </Section>

      {/* ── Theme [placeholder] ── */}
      <Section title="Branding & theme" description="Visual customisation — full upload in Sprint 2b." badge="Placeholder">
        <Field label="Logo URL">
          <input type="url" value={form.theme.logoUrl ?? ''} onChange={(e) => setNested('theme', 'logoUrl', e.target.value)} className={inputCls()} placeholder="https://…/logo.png" />
        </Field>
        <Field label="Brand colour">
          <div className="flex gap-2">
            <input type="color" value={form.theme.brandColor ?? '#0ea5e9'} onChange={(e) => setNested('theme', 'brandColor', e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-gray-300 p-0.5" />
            <input type="text" value={form.theme.brandColor ?? '#0ea5e9'} onChange={(e) => setNested('theme', 'brandColor', e.target.value)} className={cn(inputCls(), 'font-mono')} placeholder="#0ea5e9" maxLength={7} />
          </div>
        </Field>
        <Field label="Favicon URL">
          <input type="url" value={form.theme.faviconUrl ?? ''} onChange={(e) => setNested('theme', 'faviconUrl', e.target.value)} className={inputCls()} placeholder="https://…/favicon.ico" />
        </Field>
        <Field label="Custom domain" hint="e.g. book.acesports.in — DNS config required separately.">
          <input type="text" value={form.theme.customDomain ?? ''} onChange={(e) => setNested('theme', 'customDomain', e.target.value)} className={inputCls()} placeholder="book.acesports.in" />
        </Field>
      </Section>

      {/* ── Submit ── */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saveMutation.isPending}
          aria-busy={saveMutation.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          {saveMutation.isPending && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {saveMutation.isPending
            ? (isEdit ? 'Saving…' : 'Creating tenant…')
            : (isEdit ? 'Save changes' : 'Create tenant')}
        </button>
      </div>
    </form>
  );
}
