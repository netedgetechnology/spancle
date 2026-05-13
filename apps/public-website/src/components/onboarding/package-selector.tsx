'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { submitPackageSelection, formatPrice, type ActivePackage } from '@/lib/onboarding.api';

interface PackageSelectorProps {
  registrationId: string;
  packages:       ActivePackage[];
  onSuccess:      (packageId: string, tierKey: string) => void;
}

const TIER_ORDER = ['free', 'starter', 'growth', 'pro', 'enterprise'];

/**
 * PackageSelector — step 3 of onboarding.
 *
 * Renders one card per active package, ordered by tier.
 * Features:
 *   - Monthly / annual billing toggle (shows discounted price)
 *   - Highlighted "Most Popular" card
 *   - Feature bullet list from highlightFeatures
 *   - Trial days badge
 *   - Selected state with primary ring
 */
export function PackageSelector({
  registrationId,
  packages,
  onSuccess,
}: PackageSelectorProps): React.ReactElement {
  const [billing,    setBilling]    = useState<'monthly' | 'annual'>('monthly');
  const [selected,   setSelected]   = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Sort by tier order
  const sorted = [...packages].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(a.tierKey);
    const bi = TIER_ORDER.indexOf(b.tierKey);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const handleSelect = async (pkg: ActivePackage): Promise<void> => {
    setSelected(pkg.id);
    setError(null);
    setIsLoading(true);
    try {
      await submitPackageSelection(registrationId, pkg.id, billing);
      onSuccess(pkg.id, pkg.tierKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select package. Please try again.');
      setSelected(null);
    } finally {
      setIsLoading(false);
    }
  };

  const priceFor = (pkg: ActivePackage): number =>
    billing === 'annual' ? pkg.priceAnnualMinorUnits : pkg.priceMonthlyMinorUnits;

  const priceSuffix = (pkg: ActivePackage): string => {
    if (priceFor(pkg) === 0) return '';
    return billing === 'annual' ? '/yr' : '/mo';
  };

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center justify-center">
        <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
          {(['monthly', 'annual'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setBilling(opt)}
              className={cn(
                'rounded-lg px-5 py-2 text-sm font-medium transition-all capitalize',
                billing === opt
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {opt}
              {opt === 'annual' && (
                <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                  Save ~20%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Package cards */}
      <div className={cn(
        'grid gap-4',
        sorted.length <= 2 && 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto',
        sorted.length === 3 && 'grid-cols-1 sm:grid-cols-3',
        sorted.length >= 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
      )}>
        {sorted.map((pkg) => {
          const price    = priceFor(pkg);
          const suffix   = priceSuffix(pkg);
          const isSelected  = selected === pkg.id;
          const isBusy      = isLoading && isSelected;
          const featureList = pkg.highlightFeatures ?? [];

          return (
            <button
              key={pkg.id}
              type="button"
              disabled={isLoading}
              onClick={() => void handleSelect(pkg)}
              className={cn(
                'relative flex flex-col rounded-2xl border-2 p-6 text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary-500',
                'hover:shadow-md',
                pkg.isHighlighted && !isSelected && 'border-primary-300 bg-primary-50/30',
                isSelected         && 'border-primary-600 shadow-lg ring-2 ring-primary-600',
                !pkg.isHighlighted && !isSelected && 'border-gray-200 bg-white hover:border-gray-300',
                isLoading && !isSelected && 'opacity-50 cursor-not-allowed',
              )}
              aria-pressed={isSelected}
            >
              {/* Badge */}
              {pkg.badgeText && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block rounded-full bg-primary-600 px-3 py-0.5 text-xs font-bold text-white shadow-sm">
                    {pkg.badgeText}
                  </span>
                </div>
              )}

              {/* Tier label */}
              <div className="flex items-start justify-between gap-2 mb-4">
                <div>
                  <p className="text-base font-bold text-gray-900">{pkg.name}</p>
                  {pkg.description && (
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{pkg.description}</p>
                  )}
                </div>
                {isSelected && !isBusy && (
                  <div className="flex-shrink-0 h-5 w-5 rounded-full bg-primary-600 flex items-center justify-center">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
                {isBusy && (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent flex-shrink-0" aria-label="Processing" />
                )}
              </div>

              {/* Price */}
              <div className="mb-5">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {formatPrice(price, pkg.currency)}
                  </span>
                  {suffix && (
                    <span className="text-sm text-gray-500">{suffix}</span>
                  )}
                </div>
                {pkg.trialDays > 0 && (
                  <p className="text-xs text-emerald-600 font-medium mt-1">
                    {pkg.trialDays}-day free trial — no card required
                  </p>
                )}
              </div>

              {/* Features */}
              {featureList.length > 0 && (
                <ul className="flex flex-col gap-1.5 flex-1">
                  {featureList.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                      <svg
                        className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5"
                        fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              )}

              {/* CTA label */}
              <div className={cn(
                'mt-5 rounded-lg py-2 text-center text-sm font-semibold transition-colors',
                isSelected
                  ? 'bg-primary-600 text-white'
                  : pkg.isHighlighted
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-700',
              )}>
                {isBusy
                  ? 'Selecting…'
                  : isSelected
                    ? 'Selected'
                    : pkg.trialDays > 0
                      ? `Start ${pkg.trialDays}-day trial`
                      : 'Select plan'}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
