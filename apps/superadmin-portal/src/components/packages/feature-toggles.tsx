'use client';

import { cn } from '@/lib/utils/cn';
import { FEATURE_LABELS, type PackageFeatures } from '@/types/packages.types';

interface FeatureTogglesProps {
  value:    Partial<PackageFeatures>;
  onChange: (features: Partial<PackageFeatures>) => void;
  disabled?: boolean;
}

/**
 * FeatureToggles — 10 boolean feature flag toggles for a package.
 * Renders as a responsive 2-column grid of labelled toggle switches.
 */
export function FeatureToggles({ value, onChange, disabled = false }: FeatureTogglesProps): React.ReactElement {
  const keys = Object.keys(FEATURE_LABELS) as (keyof PackageFeatures)[];

  const toggle = (key: keyof PackageFeatures): void => {
    onChange({ ...value, [key]: !value[key] });
  };

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3">Feature Flags</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {keys.map((key) => {
          const enabled = value[key] ?? false;
          return (
            <label
              key={key}
              className={cn(
                'flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 cursor-pointer transition-colors',
                enabled
                  ? 'border-primary-200 bg-primary-50'
                  : 'border-gray-200 bg-white hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span className="text-sm text-gray-700 select-none">{FEATURE_LABELS[key]}</span>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={FEATURE_LABELS[key]}
                disabled={disabled}
                onClick={() => toggle(key)}
                className={cn(
                  'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                  enabled ? 'bg-primary-600' : 'bg-gray-200',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow mt-0.5 transition-transform',
                    enabled ? 'translate-x-[18px]' : 'translate-x-0.5',
                  )}
                />
              </button>
            </label>
          );
        })}
      </div>
    </div>
  );
}
