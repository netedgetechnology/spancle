'use client';

import { cn } from '@/lib/utils/cn';

export interface GuestCustomerFields {
  name:   string;
  email:  string;
  phone:  string;
}

interface GuestCustomerFormProps {
  value:     GuestCustomerFields;
  onChange:  (fields: GuestCustomerFields) => void;
  errors?:   Partial<Record<keyof GuestCustomerFields, string>>;
  className?: string;
}

const inputCls = (err?: string) => cn(
  'block w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-1 transition-colors',
  err
    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
);

/**
 * GuestCustomerForm — step added to the booking wizard when the user is not signed in.
 * Collects name, email, and optional phone for guest bookings.
 * No account creation — just the minimum needed for booking confirmation.
 */
export function GuestCustomerForm({
  value,
  onChange,
  errors,
  className,
}: GuestCustomerFormProps): React.ReactElement {
  const set = (k: keyof GuestCustomerFields) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: e.target.value });

  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <label htmlFor="guest-name" className="block text-xs font-medium text-gray-700 mb-1.5">
          Full name <span className="text-red-500">*</span>
        </label>
        <input
          id="guest-name" type="text" autoComplete="name" required
          value={value.name} onChange={set('name')}
          placeholder="Your name"
          className={inputCls(errors?.name)}
        />
        {errors?.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      <div>
        <label htmlFor="guest-email" className="block text-xs font-medium text-gray-700 mb-1.5">
          Email address <span className="text-red-500">*</span>
        </label>
        <input
          id="guest-email" type="email" autoComplete="email" required
          value={value.email} onChange={set('email')}
          placeholder="you@example.com"
          className={inputCls(errors?.email)}
        />
        {errors?.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
        <p className="mt-1 text-[10px] text-gray-400">
          Your confirmation and QR code will be emailed here.
        </p>
      </div>

      <div>
        <label htmlFor="guest-phone" className="block text-xs font-medium text-gray-700 mb-1.5">
          Phone number <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <input
          id="guest-phone" type="tel" autoComplete="tel"
          value={value.phone} onChange={set('phone')}
          placeholder="+44 7700 000000"
          className={inputCls()}
        />
      </div>
    </div>
  );
}

export function validateGuestCustomer(
  fields: GuestCustomerFields,
): Partial<Record<keyof GuestCustomerFields, string>> {
  const errors: Partial<Record<keyof GuestCustomerFields, string>> = {};
  if (!fields.name.trim()) errors.name = 'Name is required';
  if (!fields.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    errors.email = 'Enter a valid email address';
  return errors;
}
