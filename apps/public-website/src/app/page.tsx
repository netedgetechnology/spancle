import Link                         from 'next/link';
import { SectionRenderer }          from '@/components/sections/section-renderer';
import { PublicHeader }             from '@/components/layout/public-header';
import { PublicFooter }             from '@/components/layout/public-footer';
import { fetchPublishedSections }   from '@/lib/homepage.api';

export const dynamic = 'force-dynamic';

/**
 * Public website root page.
 *
 * Wraps all content in PublicHeader + PublicFooter shell.
 * Attempts to load CMS homepage sections from the API.
 * Falls back to a static branded page if the API is unavailable
 * or no sections are published yet.
 */
export default async function HomePage(): Promise<React.ReactElement> {
  // Server-only env vars — read at request time (not baked in at build).
  // Set CMS_TENANT_ID and CMS_HOMEPAGE_PAGE_ID in the PM2 environment for
  // spancle-web-public. Without them the page falls back to the static shell.
  const tenantId = process.env['CMS_TENANT_ID'] ?? '';
  const pageId   = process.env['CMS_HOMEPAGE_PAGE_ID'] ?? '';

  let sections: Awaited<ReturnType<typeof fetchPublishedSections>> = [];

  if (tenantId && pageId) {
    try {
      sections = await fetchPublishedSections(pageId, tenantId);
    } catch {
      // API unavailable — render static fallback below
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      {sections.length > 0 ? (
        <main id="main-content" className="flex-1">
          {sections.map((section) => (
            <SectionRenderer key={section.id} section={section} />
          ))}
        </main>
      ) : (
        // ── Static fallback ─────────────────────────────────────────────────
        <main className="flex-1 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-8 py-24">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white font-bold text-xl mx-auto">
              S
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
                Spancle Sports OS
              </h1>
              <p className="text-lg text-blue-200 max-w-lg mx-auto">
                Enterprise sports management for academies, clubs, and venues.
                Bookings, payments, tournaments — all in one platform.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/onboarding/signup"
                className="w-full sm:w-auto rounded-xl bg-blue-500 px-8 py-3 text-sm font-semibold text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 transition-colors"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto rounded-xl border border-white/20 px-8 py-3 text-sm font-semibold text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/40 transition-colors"
              >
                Sign in
              </Link>
            </div>
            <p className="text-xs text-blue-300/60">
              No credit card required · Free 30-day trial
            </p>
          </div>
        </main>
      )}

      <PublicFooter />
    </div>
  );
}
