'use client';

import { cn } from '@/lib/utils/cn';
import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
  type WeeklyTimings,
  type DayTiming,
} from '@/types/branch.types';

interface BranchTimingsEditorProps {
  value:    WeeklyTimings;
  onChange: (timings: WeeklyTimings) => void;
  disabled?: boolean;
}

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function TimingRow({
  day,
  timing,
  onChange,
  disabled,
}: {
  day:      DayKey;
  timing:   DayTiming;
  onChange: (t: DayTiming) => void;
  disabled: boolean;
}): React.ReactElement {
  const isOpen  = !timing.isClosed;

  return (
    <div className={cn(
      'grid grid-cols-[4rem_auto] sm:grid-cols-[4.5rem_1fr] items-center gap-3 py-2.5 border-b border-gray-50 last:border-0',
      timing.isClosed && 'opacity-60',
    )}>
      {/* Day label + toggle */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          role="switch"
          aria-checked={isOpen}
          aria-label={`${DAY_LABELS[day]} ${isOpen ? 'open' : 'closed'}`}
          disabled={disabled}
          onClick={() => onChange({ ...timing, isClosed: !timing.isClosed })}
          className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 disabled:cursor-not-allowed',
            isOpen ? 'bg-primary-600' : 'bg-gray-200',
          )}
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow mt-[3px] transition-transform',
              isOpen ? 'translate-x-[18px]' : 'translate-x-0.5',
            )}
          />
        </button>
        <span className="text-sm font-medium text-gray-700 w-8 select-none">
          {DAY_LABELS[day]}
        </span>
      </div>

      {/* Time range or closed label */}
      {isOpen ? (
        <div className="flex items-center gap-2">
          <select
            value={timing.openTime}
            disabled={disabled}
            onChange={(e) => onChange({ ...timing, openTime: e.target.value })}
            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:opacity-50"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <span className="text-xs text-gray-400 flex-shrink-0">to</span>
          <select
            value={timing.closeTime}
            disabled={disabled}
            onChange={(e) => onChange({ ...timing, closeTime: e.target.value })}
            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200 disabled:opacity-50"
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {timing.openTime >= timing.closeTime && (
            <span className="text-xs text-red-500 font-medium">Open must be before close</span>
          )}
        </div>
      ) : (
        <span className="text-sm text-gray-400 italic">Closed</span>
      )}
    </div>
  );
}

/**
 * BranchTimingsEditor — 7-day weekly schedule editor.
 *
 * Each row has:
 *   - Toggle switch: open / closed
 *   - When open: openTime and closeTime dropdowns (30-min increments)
 *   - Inline validation: warns when openTime >= closeTime
 *
 * The value prop is the full WeeklyTimings object;
 * onChange receives the updated object on every field change.
 */
export function BranchTimingsEditor({
  value,
  onChange,
  disabled = false,
}: BranchTimingsEditorProps): React.ReactElement {
  const handleDayChange = (day: DayKey, timing: DayTiming): void => {
    onChange({ ...value, [day]: timing });
  };

  const openDays = DAY_KEYS.filter((d) => !value[d].isClosed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-gray-700">Opening hours</p>
        <span className="text-xs text-gray-400">
          {openDays} day{openDays !== 1 ? 's' : ''} open
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white px-4 py-1">
        {DAY_KEYS.map((day) => (
          <TimingRow
            key={day}
            day={day}
            timing={value[day]}
            onChange={(t) => handleDayChange(day, t)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
