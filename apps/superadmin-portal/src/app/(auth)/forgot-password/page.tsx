'use client';

import { useState } from 'react';
import Link         from 'next/link';

/**
 * ForgotPasswordPage — requests a password-reset email via the Identity Service.
 * The actual email dispatch is handled by the backend; this form only submits
 * the email address to the appropriate API endpoint.
 */
export default function ForgotPasswordPage(): React.ReactElement {
  const [email,     setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const identityApi = process.env['NEXT_PUBLIC_IDENTITY_URL'] ?? '/api';

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await fetch(`${identityApi}/api/v1/auth/forgot-password`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email }),
      });
      // Always show success — never reveal whether the email exists
      setSubmitted(true);
    } catch {
      setError('Unable to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Check your email</h2>
          <p className="mt-1 text-sm text-gray-500">
            If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
        </div>
        <Link href="/login" className="block text-sm font-medium text-blue-600 hover:text-blue-700">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900">Forgot your password?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email address</label>
        <input
          id="email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit" disabled={loading}
        className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Sending…' : 'Send reset link'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">Sign in</Link>
      </p>
    </form>
  );
}
