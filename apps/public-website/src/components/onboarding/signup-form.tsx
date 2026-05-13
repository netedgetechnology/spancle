'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import { submitSignup, checkSlugAvailability, type SignupResult } from '@/lib/onboarding.api';

interface SignupFormProps {
  onSuccess: (result: SignupResult) => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

/**
 * SignupForm — step 1 of onboarding.
 *
 * Fields: fullName, orgName, slug (auto-generated + editable), email
 *
 * Slug validation:
 *   - Auto-generated from orgName as user types
 *   - Real-time availability check (debounced 600ms)
 *   - Format validated client-side before submission
 */
export function SignupForm({ onSuccess }: SignupFormProps): React.ReactElement {
  const [fullName, setFullName] = useState('');
  const [orgName,  setOrgName]  = useState('');
  const [slug,     setSlug]     = useState('');
  const [email,    setEmail]    = useState('');
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Slug availability state
  const [slugAvailable, setSlugAvailable]   = useState<boolean | null>(null);
  const [slugChecking,  setSlugChecking]    = useState(false);
  const [slugDirty,     setSlugDirty]       = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-generate slug from orgName
  useEffect(() => {
    if (!slugDirty && orgName) {
      setSlug(slugify(orgName));
    }
  }, [orgName, slugDirty]);

  // Debounced slug availability check
  const checkSlug = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 2) {
      setSlugAvailable(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSlugChecking(true);
      try {
        const { available } = await checkSlugAvailability(value);
        setSlugAvailable(available);
      } catch {
        setSlugAvailable(null);
      } finally {
        setSlugChecking(false);
      }
    }, 600);
  }, []);

  useEffect(() => {
    if (slug) checkSlug(slug);
  }, [slug, checkSlug]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim() || fullName.trim().length < 2) errs['fullName'] = 'Full name must be at least 2 characters';
    if (!orgName.trim()  || orgName.trim().length < 2)  errs['orgName']  = 'Organisation name must be at least 2 characters';
    if (!slug || !/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(slug)) {
      errs['slug'] = 'Slug must be 2–63 chars, lowercase with hyphens, cannot start or end with a hyphen';
    }
    if (slugAvailable === false) errs['slug'] = 'This subdomain is already taken';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs['email'] = 'A valid email address is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError(null);
    try {
      const result = await submitSignup({ fullName, orgName, slug, email });
      onSuccess(result);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputBase = 'block w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors';
  const inputNormal = cn(inputBase, 'border-gray-300 focus:border-primary-500 focus:ring-primary-200');
  const inputError  = cn(inputBase, 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200');

  return (
    <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-5">
      {serverError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {serverError}
        </div>
      )}

      {/* Full name */}
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
          Your full name <span className="text-red-500">*</span>
        </label>
        <input
          id="fullName"
          type="text"
          autoComplete="name"
          placeholder="Alex Johnson"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={errors['fullName'] ? inputError : inputNormal}
        />
        {errors['fullName'] && <p className="mt-1 text-xs text-red-600">{errors['fullName']}</p>}
      </div>

      {/* Org name */}
      <div>
        <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1.5">
          Organisation name <span className="text-red-500">*</span>
        </label>
        <input
          id="orgName"
          type="text"
          autoComplete="organization"
          placeholder="Acme FC"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          className={errors['orgName'] ? inputError : inputNormal}
        />
        {errors['orgName'] && <p className="mt-1 text-xs text-red-600">{errors['orgName']}</p>}
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1.5">
          Subdomain <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center rounded-lg border border-gray-300 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-200 overflow-hidden bg-white">
          <input
            id="slug"
            type="text"
            spellCheck={false}
            placeholder="acme-fc"
            value={slug}
            onChange={(e) => {
              setSlugDirty(true);
              setSlug(slugify(e.target.value));
            }}
            className="flex-1 bg-transparent px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:outline-none border-0"
          />
          <span className="flex-shrink-0 bg-gray-50 border-l border-gray-200 px-3 py-2.5 text-sm text-gray-400 whitespace-nowrap">
            .app.spancle.io
          </span>
        </div>
        <div className="mt-1 flex items-center gap-1.5 min-h-[18px]">
          {slugChecking && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full border border-gray-400 border-t-transparent animate-spin" aria-hidden="true" />
              Checking availability…
            </span>
          )}
          {!slugChecking && slugAvailable === true && slug.length >= 2 && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Available
            </span>
          )}
          {!slugChecking && (slugAvailable === false || errors['slug']) && (
            <span className="text-xs text-red-600">{errors['slug'] ?? 'This subdomain is already taken'}</span>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
          Work email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="alex@acmefc.com"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
          className={errors['email'] ? inputError : inputNormal}
        />
        {errors['email'] && <p className="mt-1 text-xs text-red-600">{errors['email']}</p>}
      </div>

      <button
        type="submit"
        disabled={isLoading || slugChecking || slugAvailable === false}
        className="mt-1 w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
      >
        {isLoading ? 'Creating account…' : 'Create free account'}
      </button>

      <p className="text-center text-xs text-gray-500">
        By continuing you agree to our{' '}
        <a href="/terms" className="underline hover:text-gray-700">Terms of Service</a>
        {' '}and{' '}
        <a href="/privacy" className="underline hover:text-gray-700">Privacy Policy</a>.
      </p>
    </form>
  );
}
