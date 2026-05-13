'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { SetupForm }     from '@/components/onboarding/setup-form';
import {
  getStoredRegistrationId,
  type CompleteOnboardingResult,
} from '@/lib/onboarding.api';

/**
 * /onboarding/setup — Step 4: final setup and provisioning.
 *
 * Renders SetupForm which collects:
 *   - Admin password (with strength meter)
 *   - Timezone + currency preferences
 *
 * On success:
 *   1. Stores access + refresh tokens in sessionStorage
 *   2. Navigates to /onboarding/welcome
 *
 * The tenant-portal dashboard reads these tokens on load for
 * the automatic post-onboarding login (Sprint 2: NextAuth session bootstrap).
 *
 * Guard: redirects to /onboarding/signup if no registrationId is stored.
 */
export default function SetupPage(): React.ReactElement {
  const router         = useRouter();
  const registrationId = getStoredRegistrationId();

  useEffect(() => {
    if (!registrationId) {
      router.replace('/onboarding/signup');
    }
  }, [registrationId, router]);

  if (!registrationId) return <></>;

  const handleSuccess = (result: CompleteOnboardingResult): void => {
    // Store tokens for automatic sign-in after onboarding
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding:accessToken',  result.accessToken);
      sessionStorage.setItem('onboarding:refreshToken', result.refreshToken);
      sessionStorage.setItem('onboarding:tenantId',     result.tenantId);
    }
    router.push('/onboarding/welcome');
  };

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator currentStep={4} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your account</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Create your admin password and configure your organisation defaults.
        </p>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
        <svg
          className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5"
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
        <p className="text-xs text-gray-500 leading-relaxed">
          Your password is hashed with bcrypt before storage. Spancle staff cannot see it.
          Store it somewhere safe — you will need it to sign in.
        </p>
      </div>

      <SetupForm
        registrationId={registrationId}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
