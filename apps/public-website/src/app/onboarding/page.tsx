'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredRegistrationId, getOnboardingStatus } from '@/lib/onboarding.api';

/**
 * /onboarding — root redirect page.
 *
 * If the browser has a stored registrationId, checks its current step
 * and routes the user back to where they left off.
 * Otherwise redirects to /onboarding/signup.
 *
 * This ensures page refresh or direct navigation to /onboarding
 * resumes the flow rather than restarting it.
 */
export default function OnboardingRootPage(): React.ReactElement {
  const router = useRouter();

  useEffect(() => {
    const resume = async (): Promise<void> => {
      const registrationId = getStoredRegistrationId();

      if (!registrationId) {
        router.replace('/onboarding/signup');
        return;
      }

      try {
        const status = await getOnboardingStatus(registrationId);

        if (!status.emailVerified) {
          router.replace('/onboarding/verify');
        } else if (!status.hasPackage) {
          router.replace('/onboarding/packages');
        } else {
          router.replace('/onboarding/setup');
        }
      } catch {
        // Registration expired — start fresh
        router.replace('/onboarding/signup');
      }
    };

    void resume();
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-3 border-primary-200 border-t-primary-600"
          aria-label="Loading"
        />
        <p className="text-sm text-gray-500">Resuming your progress…</p>
      </div>
    </div>
  );
}
