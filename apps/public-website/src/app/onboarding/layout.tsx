import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title:       'Get started — Spancle Sports OS',
  description: 'Create your sports organisation account on Spancle.',
};

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

/**
 * OnboardingLayout — the shared shell for all /onboarding/* pages.
 *
 * Layout:
 *   - Left panel (desktop): marketing copy + testimonial
 *   - Right panel: the active step form
 *
 * No sidebar, no global nav — a distraction-free onboarding experience.
 * The step indicator is rendered inside each child page, not here,
 * so each page can control which step number it displays.
 */
export default function OnboardingLayout({ children }: OnboardingLayoutProps): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">

      {/* ── Left panel (desktop only) ────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-shrink-0 flex-col justify-between bg-gradient-to-br from-primary-900 to-primary-700 p-10 text-white">
        {/* Logo */}
        <div>
          <Link href="/" className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white font-bold text-sm">
              S
            </div>
            <span className="text-lg font-bold tracking-tight">Spancle</span>
          </Link>

          <div className="mt-12">
            <p className="text-3xl font-bold leading-tight">
              The complete sports platform for your organisation.
            </p>
            <p className="mt-4 text-base text-primary-200 leading-relaxed">
              Manage academies, bookings, tournaments, and your entire team — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <ul className="mt-10 flex flex-col gap-3.5">
            {[
              'Multi-academy management',
              'Online booking & payments',
              'Tournament organisation',
              'Player & coach performance tracking',
              'Custom branding & public website',
              'Real-time analytics & reporting',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-primary-100">
                <svg
                  className="h-4 w-4 text-emerald-400 flex-shrink-0"
                  fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Testimonial */}
        <figure className="mt-8 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
          <blockquote>
            <p className="text-sm leading-relaxed text-primary-100">
              &ldquo;Spancle transformed how we run our academy. Bookings, payments,
              and player tracking all in one place — our admin time dropped by 60%.&rdquo;
            </p>
          </blockquote>
          <figcaption className="mt-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              SA
            </div>
            <div>
              <p className="text-sm font-semibold">Sarah Adeyemi</p>
              <p className="text-xs text-primary-300">Director, Apex Sports Academy</p>
            </div>
          </figcaption>
        </figure>
      </div>

      {/* ── Right panel — form area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <Link href="/" className="flex items-center gap-2 focus:outline-none">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-xs">
              S
            </div>
            <span className="font-bold text-gray-900">Spancle</span>
          </Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Sign in
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-lg">
            {children}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 text-center">
          <p className="text-xs text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-primary-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
