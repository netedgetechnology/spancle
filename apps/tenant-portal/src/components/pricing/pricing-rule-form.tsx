'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import type { PricingRule, CreatePricingRulePayload } from '@/lib/pricing.api';

const RULE_TYPES    = ['base', 'peak', 'weekend', 'holiday', 'member', 'custom'] as const;
const MOD_TYPES     = ['percentage', 'fixed', 'absolute'] as const;
const SCOPES        = ['tenant', 'branch', 'sport', 'court'] as const;
const DAYS_OF_WEEK  = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;

const RULE_TYPE_LABELS: Record<string, string> = {
  base: 'Base Rate', peak: 'Peak Hours', weekend: 'Weekend',
  holiday: 'Holiday', member: 'Member Discount', custom: 'Custom',
};
const MOD_TYPE_LABELS: Record<string, string> = {
  percentage: 'Percentage (%)', fixed: 'Fixed Amount (minor units)', absolute: 'Absolute Price',
};
const SCOPE_LABELS: Record<string, string> = {
  tenant: 'All courts (tenant-wide)', branch: 'Specific branch',
  sport: 'Specific sport', court: 'Specific court',
};

interface Props {
  initial?: Partial<PricingRule>;
  onSubmit: (values: Partial<CreatePricingRulePayload>) => void;
  isPending: boolean;
  submitLabel: string;
}

const input = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200';

export function PricingRuleForm({ initial, onSubmit, isPending, submitLabel }: Props): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    description:   initial?.description   ?? '',
    ruleType:      initial?.ruleType      ?? 'base',
    modifierType:  initial?.modifierType  ?? 'percentage',
    modifierValue: initial?.modifierValue ?? 0,
    scope:         initial?.scope         ?? 'tenant',
    branchId:      initial?.branchId      ?? '',
    sportId:       initial?.sportId       ?? '',
    courtId:       initial?.courtId       ?? '',
    validFrom:     initial?.validFrom     ?? '',
    validUntil:    initial?.validUntil    ?? '',
    daysOfWeek:    (initial?.daysOfWeek   ?? []) as string[],
    timeStart:     initial?.timeStart     ?? '',
    timeEnd:       initial?.timeEnd       ?? '',
    priority:      initial?.priority      ?? 0,
    isActive:      initial?.isActive      ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const toggleDay = (day: string) => {
    const next = form.daysOfWeek.includes(day)
      ? form.daysOfWeek.filter((d) => d !== day)
      : [...form.daysOfWeek, day];
    set('daysOfWeek', next);
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e['name'] = 'Name is required';
    if (!form.ruleType)    e['ruleType'] = 'Rule type is required';
    if (form.modifierValue === undefined) e['modifierValue'] = 'Modifier value is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      branchId:  form.branchId  || undefined,
      sportId:   form.sportId   || undefined,
      courtId:   form.courtId   || undefined,
      validFrom: form.validFrom  || undefined,
      validUntil: form.validUntil || undefined,
      timeStart: form.timeStart  || undefined,
      timeEnd:   form.timeEnd    || undefined,
      daysOfWeek: form.daysOfWeek.length > 0 ? form.daysOfWeek : undefined,
    } as Partial<CreatePricingRulePayload>);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-2xl">
      {/* Basic */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Rule details</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Name <span className="text-red-500">*</span>
            </label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className={cn(input, errors['name'] && 'border-red-400 bg-red-50')}
              placeholder="Peak hours surcharge" />
            {errors['name'] && <p className="mt-1 text-xs text-red-600">{errors['name']}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={2} value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={input} placeholder="Optional description…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Rule type <span className="text-red-500">*</span>
            </label>
            <select value={form.ruleType} onChange={(e) => set('ruleType', e.target.value as typeof form.ruleType)}
              className={cn(input, 'bg-white')}>
              {RULE_TYPES.map((t) => <option key={t} value={t}>{RULE_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Modifier type</label>
            <select value={form.modifierType}
              onChange={(e) => set('modifierType', e.target.value as typeof form.modifierType)}
              className={cn(input, 'bg-white')}>
              {MOD_TYPES.map((t) => <option key={t} value={t}>{MOD_TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Modifier value <span className="text-red-500">*</span>
            </label>
            <input type="number" value={form.modifierValue}
              onChange={(e) => set('modifierValue', Number(e.target.value))}
              className={input} />
            <p className="mt-1 text-xs text-gray-400">
              {form.modifierType === 'percentage' ? 'Percentage — e.g. 25 for +25%' : 'Minor units — e.g. 5000 for ₹50.00'}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Priority</label>
            <input type="number" min={0} max={100} value={form.priority}
              onChange={(e) => set('priority', Number(e.target.value))} className={input} />
            <p className="mt-1 text-xs text-gray-400">Higher priority rules override lower ones</p>
          </div>
        </div>
      </div>

      {/* Scope */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Scope</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Applies to</label>
            <select value={form.scope} onChange={(e) => set('scope', e.target.value as typeof form.scope)}
              className={cn(input, 'bg-white')}>
              {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABELS[s]}</option>)}
            </select>
          </div>
          {form.scope === 'branch' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Branch ID</label>
              <input type="text" value={form.branchId} onChange={(e) => set('branchId', e.target.value)}
                className={input} placeholder="Branch UUID" />
            </div>
          )}
          {form.scope === 'sport' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Sport ID</label>
              <input type="text" value={form.sportId} onChange={(e) => set('sportId', e.target.value)}
                className={input} placeholder="Sport UUID" />
            </div>
          )}
          {form.scope === 'court' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Court ID</label>
              <input type="text" value={form.courtId} onChange={(e) => set('courtId', e.target.value)}
                className={input} placeholder="Court UUID" />
            </div>
          )}
        </div>
      </div>

      {/* Time window */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-900">Time window (optional)</h3>
        </div>
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Valid from</label>
            <input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Valid until</label>
            <input type="date" value={form.validUntil} onChange={(e) => set('validUntil', e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Time start (HH:MM)</label>
            <input type="time" value={form.timeStart} onChange={(e) => set('timeStart', e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Time end (HH:MM)</label>
            <input type="time" value={form.timeEnd} onChange={(e) => set('timeEnd', e.target.value)} className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-2">Days of week</label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button key={day} type="button" onClick={() => toggleDay(day)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                    form.daysOfWeek.includes(day)
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50',
                  )}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-6">
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending}
          aria-busy={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
          {isPending && (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
