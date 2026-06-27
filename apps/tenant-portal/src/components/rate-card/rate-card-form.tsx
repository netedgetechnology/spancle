'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import type { RateCard, DateOverride, HourlySlot, WeeklyGrid } from '@/lib/rate-card.api';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'] as const;
type DayName = typeof DAYS[number];
const DAY_LABELS: Record<DayName, string> = {
  monday:'Mon', tuesday:'Tue', wednesday:'Wed',
  thursday:'Thu', friday:'Fri', saturday:'Sat', sunday:'Sun',
};
const CURRENCIES = ['GBP','USD','EUR','AED','INR','AUD','CAD','SGD'];

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200';

function priceToDisplay(minor: number | undefined | null): string {
  if (minor == null || minor === 0) return '';
  return (minor / 100).toFixed(2);
}
function displayToMinor(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : Math.round(n * 100);
}

// ── Hour price grid for one day ───────────────────────────────────────────────

function DayHourGrid({
  grid, defaultPrice, onChange,
}: {
  grid:         { hourlySlots: HourlySlot[] };
  defaultPrice: number | null;
  onChange:     (slots: HourlySlot[]) => void;
}): React.ReactElement {
  const slotMap = new Map(grid.hourlySlots.map((s) => [s.hour, s.priceMinor]));

  const setHour = (hour: number, val: string) => {
    const minor = displayToMinor(val);
    const next = new Map(slotMap);
    if (minor === null) {
      next.delete(hour);
    } else {
      next.set(hour, minor);
    }
    onChange([...next.entries()].map(([h, p]) => ({ hour: h, priceMinor: p })));
  };

  // Business hours 6–23 as rows in groups of 6
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);

  return (
    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
      {hours.map((h) => {
        const priceMinor = slotMap.get(h);
        const displayDefault = defaultPrice != null ? priceToDisplay(defaultPrice) : '';
        return (
          <div key={h} className="flex flex-col gap-0.5">
            <label className="text-[10px] text-gray-400 font-medium">{String(h).padStart(2,'0')}:00</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={priceMinor != null ? priceToDisplay(priceMinor) : ''}
              placeholder={displayDefault || '—'}
              onChange={(e) => setHour(h, e.target.value)}
              className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs text-center focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-100"
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Date override row ─────────────────────────────────────────────────────────

function DateOverrideRow({
  override, currency,
  onChange, onRemove,
}: {
  override: DateOverride;
  currency: string;
  onChange: (updated: DateOverride) => void;
  onRemove: () => void;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <input type="date" value={override.date}
          onChange={(e) => onChange({ ...override, date: e.target.value })}
          className="rounded border border-gray-300 px-2 py-1.5 text-xs" />
        <input type="text" placeholder="Label (e.g. Christmas Day)" value={override.label ?? ''}
          onChange={(e) => onChange({ ...override, label: e.target.value || undefined })}
          className="rounded border border-gray-300 px-2 py-1.5 text-xs w-44" />
        <label className="flex items-center gap-1.5 text-xs text-gray-700">
          <input type="checkbox" checked={override.allDay}
            onChange={(e) => onChange({ ...override, allDay: e.target.checked,
              priceMinor: e.target.checked ? (override.priceMinor ?? 0) : undefined,
              hourlySlots: e.target.checked ? undefined : [] })} />
          All day
        </label>
        {override.allDay && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">{currency}</span>
            <input type="number" min={0} step={0.5}
              value={override.priceMinor != null ? priceToDisplay(override.priceMinor) : ''}
              onChange={(e) => onChange({ ...override, priceMinor: displayToMinor(e.target.value) ?? 0 })}
              className="w-20 rounded border border-gray-300 px-2 py-1.5 text-xs" />
            <span className="text-xs text-gray-400">/hr</span>
          </div>
        )}
        <button type="button" onClick={onRemove}
          className="ml-auto rounded p-1 text-gray-400 hover:text-red-500 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {!override.allDay && (
        <div>
          <p className="text-[10px] text-gray-400 mb-1.5">Per-hour prices for this date (6:00–23:00)</p>
          <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
            {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => {
              const slot = (override.hourlySlots ?? []).find((s) => s.hour === h);
              const setHour = (val: string) => {
                const minor = displayToMinor(val);
                const slots = (override.hourlySlots ?? []).filter((s) => s.hour !== h);
                if (minor !== null) slots.push({ hour: h, priceMinor: minor });
                onChange({ ...override, hourlySlots: slots });
              };
              return (
                <div key={h} className="flex flex-col gap-0.5">
                  <label className="text-[10px] text-gray-400">{String(h).padStart(2,'0')}:00</label>
                  <input type="number" min={0} step={0.5}
                    value={slot ? priceToDisplay(slot.priceMinor) : ''}
                    placeholder="—"
                    onChange={(e) => setHour(e.target.value)}
                    className="w-full rounded border border-gray-200 px-1 py-1 text-xs text-center" />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── RateCardForm (root) ───────────────────────────────────────────────────────

interface Props {
  initial?:    Partial<RateCard>;
  onSubmit:    (values: Partial<RateCard>) => void;
  isPending:   boolean;
  submitLabel: string;
}

export function RateCardForm({ initial, onSubmit, isPending, submitLabel }: Props): React.ReactElement {
  const router = useRouter();
  const [form, setForm] = useState({
    name:              initial?.name              ?? '',
    description:       initial?.description       ?? '',
    currency:          initial?.currency          ?? 'GBP',
    defaultPriceMinor: initial?.defaultPriceMinor ?? null as number | null,
    weeklyGrid:        (initial?.weeklyGrid       ?? {}) as WeeklyGrid,
    dateOverrides:     (initial?.dateOverrides    ?? []) as DateOverride[],
    isActive:          initial?.isActive          ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [openDays, setOpenDays] = useState<Set<DayName>>(
    new Set(Object.keys(initial?.weeklyGrid ?? {}) as DayName[])
  );

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const toggleDay = (day: DayName) => {
    const next = new Set(openDays);
    if (next.has(day)) {
      next.delete(day);
      const grid = { ...form.weeklyGrid };
      delete grid[day];
      setForm((f) => ({ ...f, weeklyGrid: grid }));
    } else {
      next.add(day);
      setForm((f) => ({ ...f, weeklyGrid: { ...f.weeklyGrid, [day]: { hourlySlots: [] } } }));
    }
    setOpenDays(next);
  };

  const updateDayGrid = (day: DayName, slots: HourlySlot[]) => {
    setForm((f) => ({
      ...f,
      weeklyGrid: { ...f.weeklyGrid, [day]: { hourlySlots: slots } },
    }));
  };

  const addOverride = () => {
    setForm((f) => ({
      ...f,
      dateOverrides: [...f.dateOverrides, {
        date: new Date().toISOString().slice(0, 10),
        allDay: true,
        priceMinor: 0,
      }],
    }));
  };

  const updateOverride = (i: number, updated: DateOverride) => {
    const overrides = [...form.dateOverrides];
    overrides[i] = updated;
    setForm((f) => ({ ...f, dateOverrides: overrides }));
  };

  const removeOverride = (i: number) => {
    setForm((f) => ({ ...f, dateOverrides: f.dateOverrides.filter((_, idx) => idx !== i) }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e['name'] = 'Name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...form,
      description:       form.description || null,
      defaultPriceMinor: form.defaultPriceMinor,
    });
  };

  const sectionCls = 'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden';
  const sectionHead = 'border-b border-gray-100 bg-gray-50 px-6 py-4';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 max-w-4xl">
      {/* Basic info */}
      <div className={sectionCls}>
        <div className={sectionHead}><h3 className="text-sm font-semibold text-gray-900">Details</h3></div>
        <div className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)}
              className={cn(inputCls, errors['name'] && 'border-red-400 bg-red-50')}
              placeholder="Standard weekday rates" />
            {errors['name'] && <p className="mt-1 text-xs text-red-600">{errors['name']}</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea rows={2} value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Currency</label>
            <select value={form.currency} onChange={(e) => set('currency', e.target.value)}
              className={cn(inputCls, 'bg-white')}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Default price / hr</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{form.currency}</span>
              <input type="number" min={0} step={0.5}
                value={form.defaultPriceMinor != null ? priceToDisplay(form.defaultPriceMinor) : ''}
                onChange={(e) => set('defaultPriceMinor', displayToMinor(e.target.value))}
                className={inputCls} placeholder="0.00" />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Fallback for hours not specified in the weekly grid
            </p>
          </div>
        </div>
      </div>

      {/* Weekly grid */}
      <div className={sectionCls}>
        <div className={cn(sectionHead, 'flex items-center justify-between')}>
          <h3 className="text-sm font-semibold text-gray-900">Weekly pricing</h3>
          <p className="text-xs text-gray-400">Click a day to expand hour-by-hour prices</p>
        </div>
        <div className="p-6 flex flex-col gap-4">
          {DAYS.map((day) => {
            const isOpen = openDays.has(day);
            const grid = form.weeklyGrid[day] ?? { hourlySlots: [] };
            return (
              <div key={day} className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <button type="button" role="switch" aria-checked={isOpen}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                      isOpen ? 'bg-primary-600' : 'bg-gray-200',
                    )}>
                    <span className={cn(
                      'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow mt-[3px] transition-transform',
                      isOpen ? 'translate-x-[18px]' : 'translate-x-0.5',
                    )} />
                  </button>
                  <span className="text-sm font-medium text-gray-700 w-8">{DAY_LABELS[day]}</span>
                  {isOpen && (
                    <span className="text-xs text-gray-400">
                      {grid.hourlySlots.length} custom hour{grid.hourlySlots.length !== 1 ? 's' : ''}
                      {' — blank cells use default price'}
                    </span>
                  )}
                  {!isOpen && <span className="text-xs text-gray-400 italic">Uses default price</span>}
                </div>
                {isOpen && (
                  <div className="ml-11">
                    <DayHourGrid
                      grid={grid}
                      defaultPrice={form.defaultPriceMinor}
                      onChange={(slots) => updateDayGrid(day, slots)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Date overrides */}
      <div className={sectionCls}>
        <div className={cn(sectionHead, 'flex items-center justify-between')}>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Date overrides</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Override prices for specific dates — highest priority
            </p>
          </div>
          <button type="button" onClick={addOverride}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-primary-400 hover:text-primary-600 transition-colors">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add override
          </button>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {form.dateOverrides.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No date overrides. Holidays and special dates will use the weekly grid.
            </p>
          )}
          {form.dateOverrides.map((override, i) => (
            <DateOverrideRow
              key={i}
              override={override}
              currency={form.currency}
              onChange={(updated) => updateOverride(i, updated)}
              onRemove={() => removeOverride(i)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={isPending} aria-busy={isPending}
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
