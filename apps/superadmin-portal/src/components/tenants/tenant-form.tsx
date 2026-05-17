'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTenant, updateTenant, changeTenantTier, tenantKeys } from '@/lib/tenants.api';
import { cn } from '@/lib/utils/cn';
import type { TenantDetail, CreateTenantFormData } from '@/types/tenant-detail.types';
import {
  DEFAULT_MODULES, DEFAULT_COMMISSION, DEFAULT_INVOICE,
  DEFAULT_RAZORPAY, DEFAULT_PAYOUT, DEFAULT_THEME,
  TIMEZONES, CURRENCIES, COUNTRIES, SETTLEMENT_LABELS, TIER_LABELS,
} from '@/types/tenant-detail.types';
import type { TenantTier } from '@/types/admin.types';

// ── Section wrapper ────────────────────────────────────────────────────────────

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
          <span className="flex-shrink-0 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600">
            {badge}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, hint, children, full = false }: {
  label: string; hint?: string; children: React.ReactNode; full?: boolean;
}): React.ReactElement {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500';
const select_cls = input;

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}): React.ReactElement {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span className={cn(
        'relative mt-0.5 flex-shrink-0 h-5 w-9 rounded-full transition-colors duration-200',
        checked ? 'bg-blue-600' : 'bg-gray-200',
      )}>
        <span className={cn(
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )} />
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
          aria-label={label}
        />
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-700">{label}</span>
        {description && <span className="block text-xs text-gray-400 mt-0.5">{description}</span>}
      </span>
    </label>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface TenantFormProps {
  mode:    'create' | 'edit';
  tenant?: TenantDetail;
}

// ── Form ──────────────────────────────────────────────────────────────────────

export function TenantForm({ mode, tenant }: TenantFormProps): React.ReactElement {
  const router = useRouter();
  const qc     = useQueryClient();
  const isEdit = mode === 'edit';

  const [form, setForm] = useState<CreateTenantFormData>({
    name:       tenant?.name       ?? '',
    slug:       tenant?.slug       ?? '',
    email:      tenant?.email      ?? '',
    phone:      tenant?.phone      ?? '',
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof CreateTenantFormData>(key: K, val: CreateTenantFormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const setNested = <K extends keyof CreateTenantFormData>(
    key: K, field: string, val: unknown,
  ) => setForm((f) => ({ ...f, [key]: { ...(f[key] as object), [field]: val } }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e['name']  = 'Name is required';
    if (!form.slug.trim())  e['slug']  = 'Slug is required';
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(form.slug) && form.slug.length > 1)
      e['slug'] = 'Lowercase letters, numbers and hyphens only';
    if (!form.email.trim()) e['email'] = 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e['email'] = 'Valid email required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isEdit && tenant) {
        // Also handle tier change separately
        if (form.tier !== tenant.tier) {
          await changeTenantTier(tenant.id, form.tier as TenantTier);
        }
        return updateTenant(tenant.id, form);
      }
      return createTenant(form);
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: tenantKeys.all() });
      router.push(`/tenants/${saved.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    saveMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* ── Core details ── */}
      <Section title="Organisation details" description="Primary identity information for this tenant.">
        <Field label="Organisation name" hint="Full legal or trading name.">
          <input
            type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
            className={cn(input, errors['name'] && 'border-red-400')}
            placeholder="Ace Sports Club"
          />
          {errors['name'] && <p className="mt-1 text-xs text-red-500">{errors['name']}</p>}
        </Field>

        <Field label="Subdomain slug" hint={isEdit ? 'Slug cannot be changed after creation.' : 'Becomes: {slug}.spancle.com'}>
          <div className="flex">
            <input
              type="text" value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className={cn(input, 'rounded-r-none', errors['slug'] && 'border-red-400')}
              placeholder="acesports"
              disabled={isEdit}
              readOnly={isEdit}
            />
            <span className="flex items-center rounded-r-lg border border-l-0 border-gray-300 bg-gray-50 px-3 text-xs text-gray-500 whitespace-nowrap">
              .spancle.com
            </span>
          </div>
          {errors['slug'] && <p className="mt-1 text-xs text-red-500">{errors['slug']}</p>}
        </Field>

        <Field label="Owner email">
          <input
            type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
            className={cn(input, errors['email'] && 'border-red-400')}
            placeholder="admin@acesports.in"
          />
          {errors['email'] && <p className="mt-1 text-xs text-red-500">{errors['email']}</p>}
        </Field>

        <Field label="Owner mobile">
          <input
            type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)}
            className={input} placeholder="+91 98765 43210"
          />
        </Field>

        <Field label="Subscription tier">
          <select value={form.tier} onChange={(e) => set('tier', e.target.value as TenantTier)} className={select_cls}>
            {(Object.entries(TIER_LABELS) as [TenantTier, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* ── Region / locale ── */}
      <Section title="Region & locale" description="Determines currency, timezone and tax treatment.">
        <Field label="Country / Region">
          <select value={form.region} onChange={(e) => set('region', e.target.value)} className={select_cls}>
            {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>

        <Field label="Timezone">
          <select value={form.timezone} onChange={(e) => set('timezone', e.target.value)} className={select_cls}>
            {TIMEZONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>

        <Field label="Currency">
          <select value={form.currency} onChange={(e) => set('currency', e.target.value)} className={select_cls}>
            {CURRENCIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </Field>
      </Section>

      {/* ── Modules ── */}
      <Section title="Enabled modules" description="Control which platform features this tenant can access.">
        <div className="sm:col-span-2 flex flex-col gap-5">
          <Toggle
            checked={form.modules.booking}
            onChange={(v) => setNested('modules', 'booking', v)}
            label="Booking module"
            description={`Members can book courts at ${form.slug || '{slug}'}.spancle.com/booking`}
          />
          <Toggle
            checked={form.modules.reporting}
            onChange={(v) => setNested('modules', 'reporting', v)}
            label="Reports module"
            description="Revenue, occupancy and membership analytics."
          />
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Coming in future sprints</p>
            <div className="flex flex-col gap-3 opacity-50 pointer-events-none select-none">
              <Toggle checked={false} onChange={() => {}} label="Tournament module" description="Brackets, fixtures and results at {slug}.spancle.com/tournament" />
              <Toggle checked={false} onChange={() => {}} label="Academy module" description="Coaching programmes and player tracking." />
              <Toggle checked={false} onChange={() => {}} label="Communication module" description="Automated notifications, WhatsApp, email." />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Booking commission ── */}
      <Section title="Booking commission" description="Platform fee deducted per booking before payout to tenant.">
        <Field label="Commission type">
          <select
            value={form.commission.type}
            onChange={(e) => setNested('commission', 'type', e.target.value)}
            className={select_cls}
          >
            <option value="percentage">Percentage of booking value</option>
            <option value="fixed_per_booking">Fixed amount per booking</option>
          </select>
        </Field>

        <Field
          label={form.commission.type === 'percentage' ? 'Commission %' : 'Fixed amount (minor units)'}
          hint={form.commission.type === 'percentage' ? 'Enter 5 for 5%' : 'Enter in paise for INR — 5000 = ₹50'}
        >
          <input
            type="number" min={0} step={form.commission.type === 'percentage' ? 0.1 : 1}
            value={form.commission.value}
            onChange={(e) => setNested('commission', 'value', Number(e.target.value))}
            className={input}
          />
        </Field>

        <Field label="Settlement cycle" hint="How often Spancle pays the tenant.">
          <select
            value={form.commission.settlementCycle}
            onChange={(e) => setNested('commission', 'settlementCycle', e.target.value)}
            className={select_cls}
          >
            {(Object.entries(SETTLEMENT_LABELS) as [string, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
      </Section>

      {/* ── GST / Invoice ── */}
      <Section title="Invoice & GST configuration" description="Controls GST calculation and invoice formatting.">
        <div className="sm:col-span-2">
          <Toggle
            checked={form.invoice.gstEnabled}
            onChange={(v) => setNested('invoice', 'gstEnabled', v)}
            label="GST-enabled tenant"
            description="Automatically calculate CGST/SGST or IGST on invoices."
          />
        </div>

        {form.invoice.gstEnabled && (
          <>
            <Field label="GSTIN" hint="15-character GST Identification Number.">
              <input
                type="text" value={form.invoice.gstin ?? ''} maxLength={15}
                onChange={(e) => setNested('invoice', 'gstin', e.target.value.toUpperCase())}
                className={input} placeholder="29ABCDE1234F1Z5"
              />
            </Field>
            <Field label="Legal / registered name">
              <input
                type="text" value={form.invoice.legalName ?? ''}
                onChange={(e) => setNested('invoice', 'legalName', e.target.value)}
                className={input} placeholder="Ace Sports Club Pvt Ltd"
              />
            </Field>
            <Field label="State code (GST)" hint="2-digit code, e.g. 29 for Karnataka.">
              <input
                type="text" value={form.invoice.gstState ?? ''} maxLength={2}
                onChange={(e) => setNested('invoice', 'gstState', e.target.value)}
                className={input} placeholder="29"
              />
            </Field>
            <Field label="HSN / SAC code" hint="Default 999335 for sports & recreation services.">
              <input
                type="text" value={form.invoice.hsnSacCode ?? '999335'}
                onChange={(e) => setNested('invoice', 'hsnSacCode', e.target.value)}
                className={input}
              />
            </Field>
          </>
        )}
      </Section>

      {/* ── Razorpay [placeholder] ── */}
      <Section title="Payment gateway — Razorpay" description="Platform payment configuration." badge="Placeholder">
        <div className="sm:col-span-2">
          <Toggle
            checked={form.razorpay.enabled}
            onChange={(v) => setNested('razorpay', 'enabled', v)}
            label="Enable Razorpay for this tenant"
            description="When enabled, bookings are collected via Razorpay. (Full integration in Sprint 3)"
          />
        </div>
        {form.razorpay.enabled && (
          <Field label="Razorpay account / route ID" hint="Razorpay linked account ID for payouts." full>
            <input
              type="text" value={form.razorpay.accountId ?? ''}
              onChange={(e) => setNested('razorpay', 'accountId', e.target.value)}
              className={input} placeholder="acc_XXXXXXXXXXXXXXXX"
            />
          </Field>
        )}
        <Field label="Notes" full>
          <input
            type="text" value={form.razorpay.notes ?? ''}
            onChange={(e) => setNested('razorpay', 'notes', e.target.value)}
            className={input} placeholder="Internal notes about gateway setup"
          />
        </Field>
      </Section>

      {/* ── Payout details [placeholder] ── */}
      <Section title="Payout / bank details" description="Tenant bank account for settlement payouts." badge="Placeholder">
        <Field label="Preferred payout method">
          <select
            value={form.payout.preferredMethod ?? 'bank'}
            onChange={(e) => setNested('payout', 'preferredMethod', e.target.value)}
            className={select_cls}
          >
            <option value="bank">Bank transfer (NEFT/IMPS)</option>
            <option value="upi">UPI</option>
          </select>
        </Field>

        {form.payout.preferredMethod === 'bank' && (
          <>
            <Field label="Bank name">
              <input type="text" value={form.payout.bankName ?? ''} onChange={(e) => setNested('payout', 'bankName', e.target.value)} className={input} placeholder="HDFC Bank" />
            </Field>
            <Field label="Account holder name">
              <input type="text" value={form.payout.accountHolder ?? ''} onChange={(e) => setNested('payout', 'accountHolder', e.target.value)} className={input} />
            </Field>
            <Field label="Account number" hint="Stored securely — not displayed after save.">
              <input type="password" value={form.payout.accountNumber ?? ''} onChange={(e) => setNested('payout', 'accountNumber', e.target.value)} className={input} autoComplete="off" />
            </Field>
            <Field label="IFSC code">
              <input type="text" value={form.payout.ifscCode ?? ''} onChange={(e) => setNested('payout', 'ifscCode', e.target.value.toUpperCase())} className={input} placeholder="HDFC0001234" />
            </Field>
          </>
        )}

        {form.payout.preferredMethod === 'upi' && (
          <Field label="UPI ID" full>
            <input type="text" value={form.payout.upiId ?? ''} onChange={(e) => setNested('payout', 'upiId', e.target.value)} className={input} placeholder="acesports@hdfc" />
          </Field>
        )}
      </Section>

      {/* ── Theme [placeholder] ── */}
      <Section title="Branding & theme" description="Visual customisation for the tenant portal." badge="Placeholder">
        <Field label="Logo URL" hint="Direct URL to tenant logo image.">
          <input type="url" value={form.theme.logoUrl ?? ''} onChange={(e) => setNested('theme', 'logoUrl', e.target.value)} className={input} placeholder="https://…/logo.png" />
        </Field>
        <Field label="Brand colour" hint="Primary colour used in the tenant portal.">
          <div className="flex gap-2">
            <input
              type="color"
              value={form.theme.brandColor ?? '#0ea5e9'}
              onChange={(e) => setNested('theme', 'brandColor', e.target.value)}
              className="h-9 w-12 cursor-pointer rounded-lg border border-gray-300 p-0.5"
            />
            <input
              type="text"
              value={form.theme.brandColor ?? '#0ea5e9'}
              onChange={(e) => setNested('theme', 'brandColor', e.target.value)}
              className={cn(input, 'font-mono')}
              placeholder="#0ea5e9"
              maxLength={7}
            />
          </div>
        </Field>
        <Field label="Favicon URL" hint="Placeholder — coming with Sprint 2 media upload.">
          <input type="url" value={form.theme.faviconUrl ?? ''} onChange={(e) => setNested('theme', 'faviconUrl', e.target.value)} className={input} placeholder="https://…/favicon.ico" />
        </Field>
        <Field label="Custom domain" hint="e.g. book.acesports.in — DNS and SSL config required separately.">
          <input type="text" value={form.theme.customDomain ?? ''} onChange={(e) => setNested('theme', 'customDomain', e.target.value)} className={input} placeholder="book.acesports.in" />
        </Field>
      </Section>

      {/* ── Submit ── */}
      {saveMutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to save tenant. Please check the form and try again.
        </div>
      )}

      <div className="flex items-center justify-end gap-3 pb-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {saveMutation.isPending
            ? (isEdit ? 'Saving…' : 'Creating…')
            : (isEdit ? 'Save changes' : 'Create tenant')
          }
        </button>
      </div>
    </form>
  );
}
