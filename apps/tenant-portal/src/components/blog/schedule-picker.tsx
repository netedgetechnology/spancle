'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

interface SchedulePickerProps {
  /** ISO-8601 UTC string, or null if not scheduled */
  value:    string | null | undefined;
  onChange: (isoUtc: string | null) => void;
  /** Minimum selectable date — defaults to now + 5 min */
  minDate?: Date;
  disabled?: boolean;
  className?: string;
}

/**
 * SchedulePicker — datetime input for scheduled post publishing.
 *
 * Contract:
 *   - Displays time in the user's local timezone (browser handles this)
 *   - Stores and emits value as UTC ISO-8601 string
 *   - Validates that the selected time is in the future
 *   - Shows timezone label so admins know what timezone is active
 *
 * Example output: "2025-06-01T09:00:00.000Z"
 */
export function SchedulePicker({
  value,
  onChange,
  minDate,
  disabled = false,
  className,
}: SchedulePickerProps): React.ReactElement {
  const [localVal, setLocalVal] = useState('');
  const [error, setError]       = useState<string | null>(null);

  // Derive the min value for the input (local datetime string)
  const minDatetime  = (minDate ?? new Date(Date.now() + 5 * 60 * 1000));
  const minLocalStr  = toLocalDatetimeValue(minDatetime);

  // Timezone label — e.g. "Europe/London (UTC+1)"
  const tzLabel      = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const tzOffset     = -(new Date().getTimezoneOffset());
  const tzSign       = tzOffset >= 0 ? '+' : '-';
  const tzHours      = String(Math.floor(Math.abs(tzOffset) / 60)).padStart(2, '0');
  const tzMins       = String(Math.abs(tzOffset) % 60).padStart(2, '0');
  const tzOffsetStr  = `UTC${tzSign}${tzHours}:${tzMins}`;

  // Initialise from prop
  useEffect(() => {
    if (value) {
      setLocalVal(toLocalDatetimeValue(new Date(value)));
    } else {
      setLocalVal('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    setLocalVal(raw);

    if (!raw) {
      setError(null);
      onChange(null);
      return;
    }

    const selected = new Date(raw);
    if (isNaN(selected.getTime())) {
      setError('Invalid date');
      return;
    }

    if (selected <= new Date()) {
      setError('Scheduled time must be in the future');
      onChange(null);
      return;
    }

    setError(null);
    onChange(selected.toISOString());
  };

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-sm font-medium text-gray-700">
        Publish date &amp; time
        <span className="ml-2 text-xs font-normal text-gray-400">
          {tzLabel} ({tzOffsetStr})
        </span>
      </label>

      <input
        type="datetime-local"
        value={localVal}
        min={minLocalStr}
        disabled={disabled}
        onChange={handleChange}
        className={cn(
          'block w-full rounded-md border px-3 py-2 text-sm text-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error
            ? 'border-red-400 focus:border-red-500 bg-red-50'
            : 'border-gray-300 focus:border-primary-500',
        )}
      />

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      {localVal && !error && (
        <p className="text-xs text-gray-400">
          Publishes at{' '}
          <span className="font-medium text-gray-600">
            {new Date(localVal).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </span>
          {' '}local time
        </p>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Converts a Date to the format required by <input type="datetime-local"> */
function toLocalDatetimeValue(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
