'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { VerifyForm }    from '@/components/onboarding/verify-form';
import {
  getStoredRegistrationId,
  getStoredEmail,
  submitEmailVerification,
} from '@/lib/onboarding.api';

/**
 * /onboarding/verify — Step 2: email verification.
 *
 * Two modes:
 *   a) URL params present (?r=registrationId&t=token) — auto-submits on mount.
 *      This is the common path: user clicks the link in the verification email.
 *
 *   b) No URL params — shows VerifyForm for manual token paste.
 *      This handles cases where the link was not clickable (e.g. plain-text email client).
 *
 * The registrationId is read from URL params first, then localStorage.
 * If neither is available, redirects to /onboarding/signup.
 */
export default function VerifyPage(): React.ReactElement {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [autoState, setAutoState] = useState<'idle' | 'verifying' | 'error'>('idle');
  const [autoError, setAutoError] = useState<string | null>(null);

  const urlRegistrationId = searchParams.get('r');
  const urlToken          = searchParams.get('t');

  const registrationId = urlRegistrationId ?? getStoredRegistrationId();
  const maskedEmail    = getStoredEmail() ?? 'your email';

  // Redirect if no registrationId available
  useEffect(() => {
    if (!registrationId) {
      router.replace('/onboarding/signup');
    }
  }, [registrationId, router]);

  // Auto-submit when URL params are present
  useEffect(() => {
    if (!urlToken || !urlRegistrationId || autoState !== 'idle') return;

    const autoVerify = async (): Promise<void> => {
      setAutoState('verifying');
      try {
        const { verified } = await submitEmailVerification(urlRegistrationId, urlToken);
        if (verified) {
          router.replace('/onboarding/packages');
        } else {
          setAutoState('error');
          setAutoError('The verification link has expired or was already used. Request a new one below.');
        }
      } catch (err) {
        setAutoState('error');
        setAutoError(
          err instanceof Error
            ? err.message
            : 'Verification failed. Please paste the token manually.',
        );
      }
    };

    void autoVerify();
  }, [urlToken, urlRegistrationId, autoState, router]);

  if (!registrationId) return <></>;

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator currentStep={2} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Verify your email</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          We need to confirm your email before continuing.
        </p>
      </div>

      {/* Auto-verify progress */}
      {autoState === 'verifying' && (
        <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-200 px-5 py-4">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-blue-300 border-t-blue-600 flex-shrink-0"
            aria-label="Verifying"
          />
          <p className="text-sm text-blue-700 font-medium">Verifying your email…</p>
        </div>
      )}

      {/* Auto-verify failed → show manual form */}
      {(autoState === 'idle' || autoState === 'error') && (
        <>
          {autoError && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              {autoError}
            </div>
          )}
          <VerifyForm
            registrationId={registrationId}
            maskedEmail={maskedEmail}
            onSuccess={() => router.push('/onboarding/packages')}
          />
        </>
      )}
    </div>
  );
}
