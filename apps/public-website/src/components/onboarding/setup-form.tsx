'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { submitComplete, type CompleteOnboardingResult } from '@/lib/onboarding.api';

interface SetupFormProps {
  registrationId: string;
  onSuccess:      (result: CompleteOnboardingResult) => void;
}

// ── Password strength ──────────────────────────────────────────────────────────

interface StrengthResult {
  score:   0 | 1 | 2 | 3 | 4;
  label:   string;
  color:   string;
  checks:  { label: string; pass: boolean }[];
}

function assessPassword(password: string): StrengthResult {
  const checks = [
    { label: 'At least 8 characters',        pass: password.length >= 8 },
    { label: 'One uppercase letter',          pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter',          pass: /[a-z]/.test(password) },
    { label: 'One number',                    pass: /[0-9]/.test(password) },
    { label: 'One special character (!@#…)',  pass: /[^A-Za-z0-9]/.test(password) },
  ];

  const passed = checks.filter((c) => c.pass).length as 0 | 1 | 2 | 3 | 4 | 5;
  const score  = Math.min(4, Math.floor((passed / checks.length) * 5)) as 0 | 1 | 2 | 3 | 4;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500'];

  return { score, label: labels[score] ?? '', color: colors[score] ?? '', checks };
}

const TIMEZONES = [
  'UTC', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Amsterdam',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Australia/Sydney',
];

const CURRENCIES = [
  { code: 'GBP', label: '£ British Pound' },
  { code: 'USD', label: '$ US Dollar'     },
  { code: 'EUR', label: '€ Euro'           },
  { code: 'AUD', label: 'A$ Australian Dollar' },
  { code: 'CAD', label: 'C$ Canadian Dollar'   },
  { code: 'AED', label: 'AED UAE Dirham'        },
];

/**
 * SetupForm — step 4 of onboarding.
 *
 * Collects:
 *   - Admin password + confirmation
 *   - Timezone selection (defaults to browser timezone)
 *   - Currency selection (defaults to GBP)
 *
 * On submit: calls POST /onboarding/complete which provisions the full
 * tenant ecosystem and returns access tokens for immediate auto-login.
 */
export function SetupForm({ registrationId, onSuccess }: SetupFormProps): React.ReactElement {
  const browserTz  = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : 'UTC';

  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [timezone,    setTimezone]    = useState(TIMEZONES.includes(browserTz) ? browserTz : 'UTC');
  const [currency,    setCurrency]    = useState('GBP');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors,      setErrors]      = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);

  const strength = useMemo(() => assessPassword(password), [password]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!password) {
      errs['password'] = 'Password is required';
    } else if (strength.score < 3) {
      errs['password'] = 'Password is too weak — meet all requirements below';
    }

    if (!confirm) {
      errs['confirm'] = 'Please confirm your password';
    } else if (password !== confirm) {
      errs['confirm'] = 'Passwords do not match';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);

    try {
      const result = await submitComplete({
        registrationId,
        password,
        confirmPassword: confirm,
        timezone,
        currency,
      });
      onSuccess(result);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : 'Setup failed. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase = 'block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';
  const inputNormal = cn(inputBase, 'border-gray-300 focus:border-primary-500 focus:ring-primary-200');
  const inputError  = cn(inputBase, 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200');

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-6">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {serverError}
        </div>
      )}

      {/* ── Password ──────────────────────────────────────────────────────── */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-4">Admin account password</legend>

        <div className="flex flex-col gap-4">
          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors['password']) setErrors((p) => ({ ...p, password: '' }));
                }}
                className={cn(errors['password'] ? inputError : inputNormal, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {showPwd ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            {errors['password'] && (
              <p className="mt-1 text-xs text-red-600">{errors['password']}</p>
            )}

            {/* Strength meter */}
            {password.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex gap-1" aria-label={`Password strength: ${strength.label}`}>
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={cn(
                        'h-1.5 flex-1 rounded-full transition-colors duration-300',
                        bar <= strength.score ? strength.color : 'bg-gray-200',
                      )}
                    />
                  ))}
                  <span className="ml-2 text-xs font-medium text-gray-600 w-12 flex-shrink-0">
                    {strength.label}
                  </span>
                </div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {strength.checks.map((check) => (
                    <li
                      key={check.label}
                      className={cn(
                        'flex items-center gap-1.5 text-xs',
                        check.pass ? 'text-emerald-600' : 'text-gray-400',
                      )}
                    >
                      <svg
                        className="h-3 w-3 flex-shrink-0"
                        fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                        aria-hidden="true"
                      >
                        {check.pass ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        )}
                      </svg>
                      {check.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
              Confirm password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (errors['confirm']) setErrors((p) => ({ ...p, confirm: '' }));
                }}
                className={cn(errors['confirm'] ? inputError : inputNormal, 'pr-10')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  {showConfirm
                    ? <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>
                  }
                </svg>
              </button>
            </div>
            {errors['confirm'] && (
              <p className="mt-1 text-xs text-red-600">{errors['confirm']}</p>
            )}
            {confirm && password === confirm && !errors['confirm'] && (
              <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Passwords match
              </p>
            )}
          </div>
        </div>
      </fieldset>

      {/* ── Organisation settings ──────────────────────────────────────── */}
      <fieldset>
        <legend className="text-sm font-semibold text-gray-800 mb-4">Organisation settings</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1.5">
              Timezone
            </label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className={inputNormal}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1.5">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputNormal}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={isLoading || strength.score < 3 || password !== confirm}
        className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        {isLoading ? 'Setting up your account…' : 'Complete setup'}
      </button>
    </form>
  );
}
