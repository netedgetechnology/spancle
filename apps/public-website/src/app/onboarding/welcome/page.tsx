'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * /onboarding/welcome — Step 5: success screen.
 *
 * Displayed after provisioning completes.
 * Retrieves tenantId from sessionStorage (set in SetupPage on success).
 *
 * Sprint 2: This page will call NextAuth signIn() with the tokens stored
 * in sessionStorage to bootstrap an authenticated session, then redirect
 * directly into the dashboard. For Sprint 1, the dashboard link is shown
 * with instructions to sign in.
 */
export default function WelcomePage(): React.ReactElement {
  const [tenantId,   setTenantId]   = useState<string | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const id = sessionStorage.getItem('onboarding:tenantId');
    setTenantId(id);
    // Clear sensitive tokens from sessionStorage
    sessionStorage.removeItem('onboarding:accessToken');
    sessionStorage.removeItem('onboarding:refreshToken');
    // Animate in
    const t = setTimeout(() => setIsAnimated(true), 50);
    return () => clearTimeout(t);
  }, []);

  const NEXT_STEPS = [
    { icon: '🏟️', label: 'Add your first academy or venue' },
    { icon: '📅', label: 'Set up your booking schedule' },
    { icon: '👥', label: 'Invite coaches and staff' },
    { icon: '⚽', label: 'Create your first tournament' },
    { icon: '🎨', label: 'Customise your public-facing page' },
  ];

  return (
    <div
      className={cn(
        'flex flex-col gap-8 transition-all duration-500',
        isAnimated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      )}
    >
      {/* Success indicator */}
      <div className="flex flex-col items-center text-center gap-5">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-10 w-10 text-emerald-600"
              fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          {/* Animated ring */}
          <div className={cn(
            'absolute inset-0 rounded-full border-2 border-emerald-300 transition-all duration-700',
            isAnimated ? 'scale-150 opacity-0' : 'scale-100 opacity-100',
          )} aria-hidden="true" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome to Spancle! 🎉
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            Your organisation is set up and ready to go. Your trial has started — no credit card needed.
          </p>
        </div>
      </div>

      {/* Account details */}
      {tenantId && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Account reference
          </p>
          <p className="text-xs font-mono text-gray-600 break-all">{tenantId}</p>
        </div>
      )}

      {/* Next steps */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">Suggested first steps</p>
        </div>
        <ul className="divide-y divide-gray-50">
          {NEXT_STEPS.map((step, i) => (
            <li
              key={step.label}
              className={cn(
                'flex items-center gap-3.5 px-5 py-3 transition-all duration-300',
                isAnimated ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2',
              )}
              style={{ transitionDelay: `${150 + i * 60}ms` }}
            >
              <span className="text-xl flex-shrink-0" aria-hidden="true">{step.icon}</span>
              <span className="text-sm text-gray-700">{step.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Go to dashboard
          <svg
            className="ml-2 h-4 w-4"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>

        <Link
          href="/"
          className="text-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Back to marketing site
        </Link>
      </div>

      {/* Support note */}
      <p className="text-center text-xs text-gray-400">
        Need help?{' '}
        <a href="mailto:support@spancle.io" className="underline hover:text-gray-600">
          Contact our team
        </a>
        {' '}— we&apos;re here to get you set up.
      </p>
    </div>
  );
}
