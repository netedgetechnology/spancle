'use client';

import { useRouter } from 'next/navigation';
import { StepIndicator } from '@/components/onboarding/step-indicator';
import { SignupForm }     from '@/components/onboarding/signup-form';
import type { SignupResult } from '@/lib/onboarding.api';

/**
 * /onboarding/signup — Step 1: account creation.
 *
 * Collects: full name, organisation name, slug, email.
 * On success: stores registrationId + navigates to /onboarding/verify.
 */
export default function SignupPage(): React.ReactElement {
  const router = useRouter();

  const handleSuccess = (_result: SignupResult): void => {
    // registrationId already stored in localStorage by SignupForm → onboarding.api.ts
    router.push('/onboarding/verify');
  };

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator currentStep={1} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Set up your sports organisation on Spancle in under 5 minutes.
        </p>
      </div>

      <SignupForm onSuccess={handleSuccess} />
    </div>
  );
}
