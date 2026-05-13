'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import {
  submitEmailVerification,
  resendVerificationEmail,
} from '@/lib/onboarding.api';

interface VerifyFormProps {
  registrationId: string;
  maskedEmail:    string;
  onSuccess:      () => void;
}

/**
 * VerifyForm — step 2 of onboarding.
 *
 * The verification token is a 64-char hex string sent in the email URL:
 *   /onboarding/verify?r={registrationId}&t={token}
 *
 * The page auto-submits when both params are present in the URL.
 * If the user lands on the page without URL params (direct navigation),
 * they paste the token manually.
 *
 * Resend:
 *   - 60-second cooldown after each resend
 *   - Max 3 resends shown (backend throttles further)
 */
export function VerifyForm({
  registrationId,
  maskedEmail,
  onSuccess,
}: VerifyFormProps): React.ReactElement {
  const [token,        setToken]        = useState('');
  const [isVerifying,  setIsVerifying]  = useState(false);
  const [isResending,  setIsResending]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount,    setResendCount]    = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = (): void => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const trimmed = token.trim();

    if (!trimmed) {
      setError('Please enter the verification token from your email.');
      return;
    }

    if (trimmed.length !== 64) {
      setError('The token must be exactly 64 characters. Please copy it directly from the email link.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const { verified } = await submitEmailVerification(registrationId, trimmed);
      if (verified) {
        onSuccess();
      } else {
        setError('Verification failed. The token may have expired — request a new one.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async (): Promise<void> => {
    if (resendCooldown > 0 || resendCount >= 3) return;

    setIsResending(true);
    setError(null);

    try {
      await resendVerificationEmail(registrationId);
      setResendCount((c) => c + 1);
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend. Please try again shortly.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Instruction */}
      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
        <div className="flex gap-3">
          <svg
            className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-blue-800">Check your email</p>
            <p className="text-sm text-blue-700 mt-0.5">
              We sent a verification link to <span className="font-mono font-medium">{maskedEmail}</span>.
              Click the link or paste the token below.
            </p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Token form */}
      <form onSubmit={(e) => void handleSubmit(e)} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1.5">
            Verification token
          </label>
          <textarea
            id="token"
            rows={3}
            spellCheck={false}
            placeholder="Paste the token from your verification email…"
            value={token}
            onChange={(e) => {
              setToken(e.target.value.trim());
              if (error) setError(null);
            }}
            className="block w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm font-mono text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 placeholder:font-sans placeholder:text-gray-400"
          />
          <p className="mt-1 text-xs text-gray-400">
            {token.length > 0 ? (
              <span className={cn(token.trim().length === 64 ? 'text-emerald-600' : 'text-amber-600')}>
                {token.trim().length}/64 characters
              </span>
            ) : (
              'Token is 64 characters long'
            )}
          </p>
        </div>

        <button
          type="submit"
          disabled={isVerifying || token.trim().length !== 64}
          className="w-full rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {isVerifying ? 'Verifying…' : 'Verify email'}
        </button>
      </form>

      {/* Resend */}
      <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Didn&apos;t receive it?</p>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isResending || resendCooldown > 0 || resendCount >= 3}
          className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none"
        >
          {isResending
            ? 'Sending…'
            : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : resendCount >= 3
                ? 'Maximum resends reached'
                : 'Resend verification email'}
        </button>
      </div>
    </div>
  );
}
