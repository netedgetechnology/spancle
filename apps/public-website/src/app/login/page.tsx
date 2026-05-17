'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

export default function TenantFinderPage(): React.ReactElement {
  const [query,   setQuery]   = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setError(null);

    startTransition(async () => {
      try {
        const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? '';
        const res = await fetch(
          `${apiBase}/api/v1/tenants/resolve?q=${encodeURIComponent(q)}`,
          { headers: { 'Content-Type': 'application/json' } },
        );

        if (!res.ok) {
          setError('Organisation not found. Check the name or email and try again.');
          return;
        }

        const data = (await res.json()) as { slug: string; name: string; redirectUrl: string } | null;

        if (!data?.redirectUrl) {
          setError('Organisation not found. Check the name or email and try again.');
          return;
        }

        // Redirect to tenant portal
        window.location.href = data.redirectUrl;
      } catch {
        setError('Something went wrong. Please try again.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-4">
      {/* Dot grid overlay */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.05) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-10">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 text-white font-bold text-base">
            S
          </span>
          <span className="text-base font-semibold text-white">Spancle</span>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 shadow-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white">Sign in to your organisation</h1>
            <p className="mt-2 text-sm text-blue-200/70">
              Enter your organisation name, subdomain, or admin email
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="org-query" className="block text-xs font-medium text-blue-200/80 mb-1.5">
                Organisation name or email
              </label>
              <input
                id="org-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="acesports or admin@acesports.in"
                autoComplete="organization"
                autoFocus
                required
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/15 border border-red-400/30 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending || query.trim().length < 2}
              className="w-full rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              {pending ? 'Finding your organisation…' : 'Continue'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-blue-300/50">
          New to Spancle?{' '}
          <Link href="/onboarding/signup" className="text-blue-300 hover:text-white transition-colors underline underline-offset-2">
            Start a free trial
          </Link>
        </p>
      </div>
    </div>
  );
}
