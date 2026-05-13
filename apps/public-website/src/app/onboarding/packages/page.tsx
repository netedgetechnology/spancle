'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepIndicator }    from '@/components/onboarding/step-indicator';
import { PackageSelector }  from '@/components/onboarding/package-selector';
import {
  getStoredRegistrationId,
  fetchActivePackages,
  type ActivePackage,
} from '@/lib/onboarding.api';

/**
 * /onboarding/packages — Step 3: plan selection.
 *
 * Fetches active packages from saas-platform-service and renders
 * PackageSelector. On selection, advances to /onboarding/setup.
 *
 * Guard: redirects to /onboarding/signup if no registrationId is stored.
 */
export default function PackagesPage(): React.ReactElement {
  const router = useRouter();

  const [packages,  setPackages]  = useState<ActivePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const registrationId = getStoredRegistrationId();

  useEffect(() => {
    if (!registrationId) {
      router.replace('/onboarding/signup');
      return;
    }

    const load = async (): Promise<void> => {
      try {
        const pkgs = await fetchActivePackages();
        setPackages(pkgs);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load packages. Please refresh the page.',
        );
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [registrationId, router]);

  if (!registrationId) return <></>;

  return (
    <div className="flex flex-col gap-8">
      <StepIndicator currentStep={3} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Choose your plan</h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Start free and upgrade anytime. All paid plans include a free trial.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-72 rounded-2xl border border-gray-200 animate-pulse bg-gray-100"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ml-3 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <PackageSelector
          registrationId={registrationId}
          packages={packages}
          onSuccess={(_packageId, _tierKey) => {
            router.push('/onboarding/setup');
          }}
        />
      )}
    </div>
  );
}
