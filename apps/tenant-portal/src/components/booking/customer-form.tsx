'use client';

import { cn } from '@/lib/utils/cn';
import type { BookingFormValues } from '@/types/booking.types';

interface CustomerFormProps {
  values:    Pick<BookingFormValues, 'customerName' | 'customerEmail' | 'customerPhone' | 'isMember' | 'userId' | 'participantCount'>;
  onChange:  <K extends keyof CustomerFormProps['values']>(key: K, value: CustomerFormProps['values'][K]) => void;
  errors?:   Partial<Record<keyof CustomerFormProps['values'], string>>;
  disabled?: boolean;
}

const inp = (hasError?: boolean) => cn(
  'block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900',
  'focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors',
  hasError
    ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200'
    : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
);

/**
 * CustomerForm — customer details section used inside the booking modal.
 * Controlled component — parent owns form values.
 */
export function CustomerForm({
  values,
  onChange,
  errors = {},
  disabled = false,
}: CustomerFormProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4">
      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Full name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={values.customerName}
            disabled={disabled}
            onChange={(e) => onChange('customerName', e.target.value)}
            placeholder="Alex Johnson"
            className={inp(!!errors.customerName)}
            autoComplete="name"
          />
          {errors.customerName && (
            <p className="mt-1 text-xs text-red-600">{errors.customerName}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={values.customerEmail}
            disabled={disabled}
            onChange={(e) => onChange('customerEmail', e.target.value.toLowerCase())}
            placeholder="alex@example.com"
            className={inp(!!errors.customerEmail)}
            autoComplete="email"
          />
          {errors.customerEmail && (
            <p className="mt-1 text-xs text-red-600">{errors.customerEmail}</p>
          )}
        </div>
      </div>

      {/* Phone + Participants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Phone</label>
          <input
            type="tel"
            value={values.customerPhone}
            disabled={disabled}
            onChange={(e) => onChange('customerPhone', e.target.value)}
            placeholder="+44 7700 000000"
            className={inp()}
            autoComplete="tel"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">Participants</label>
          <input
            type="number"
            min={1}
            max={100}
            value={values.participantCount}
            disabled={disabled}
            onChange={(e) => onChange('participantCount', Math.max(1, Number(e.target.value)))}
            className={inp()}
          />
        </div>
      </div>

      {/* User ID (optional member lookup) */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1.5">
          User ID
          <span className="ml-1 font-normal text-gray-400">(optional — links to member account)</span>
        </label>
        <input
          type="text"
          value={values.userId}
          disabled={disabled}
          onChange={(e) => onChange('userId', e.target.value.trim())}
          placeholder="UUID"
          className={cn(inp(), 'font-mono text-sm')}
        />
      </div>

      {/* Member toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none group">
        <button
          type="button"
          role="switch"
          aria-checked={values.isMember}
          disabled={disabled}
          onClick={() => onChange('isMember', !values.isMember)}
          className={cn(
            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
            'disabled:cursor-not-allowed',
            values.isMember ? 'bg-primary-600' : 'bg-gray-200',
          )}
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow mt-[3px] transition-transform',
              values.isMember ? 'translate-x-[18px]' : 'translate-x-0.5',
            )}
          />
        </button>
        <div>
          <p className="text-sm font-medium text-gray-700">Member booking</p>
          <p className="text-xs text-gray-400">Applies member pricing and discount rules</p>
        </div>
      </label>
    </div>
  );
}
