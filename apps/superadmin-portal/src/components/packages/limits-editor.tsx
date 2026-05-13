'use client';

import { LIMIT_LABELS, type PackageLimits } from '@/types/packages.types';
import { cn } from '@/lib/utils/cn';

interface LimitsEditorProps {
  value:    Partial<PackageLimits>;
  onChange: (limits: Partial<PackageLimits>) => void;
  disabled?: boolean;
}

/**
 * LimitsEditor — 9 resource limit number inputs.
 * -1 = unlimited. Displays "Unlimited" badge next to the input when -1 is set.
 */
export function LimitsEditor({ value, onChange, disabled = false }: LimitsEditorProps): React.ReactElement {
  const keys = Object.keys(LIMIT_LABELS) as (keyof PackageLimits)[];

  const handleChange = (key: keyof PackageLimits, raw: string): void => {
    const parsed = raw === '' ? 0 : parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange({ ...value, [key]: parsed });
    }
  };

  const toggleUnlimited = (key: keyof PackageLimits): void => {
    const current = value[key] ?? 0;
    onChange({ ...value, [key]: current === -1 ? 100 : -1 });
  };

  return (
    <div>
      <p className="text-sm font-semibold text-gray-700 mb-3">Resource Limits</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {keys.map((key) => {
          const meta      = LIMIT_LABELS[key];
          const current   = value[key] ?? 0;
          const unlimited = current === -1;

          return (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">{meta.label}</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={-1}
                  value={unlimited ? '' : current}
                  placeholder={unlimited ? 'Unlimited' : '0'}
                  disabled={disabled || unlimited}
                  onChange={(e) => handleChange(key, e.target.value)}
                  className={cn(
                    'flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm',
                    'focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-200',
                    'disabled:bg-gray-50 disabled:text-gray-400',
                    unlimited && 'bg-indigo-50 border-indigo-200',
                  )}
                />
                <span className="text-xs text-gray-400 w-10 flex-shrink-0">{meta.unit}</span>
                <button
                  type="button"
                  title={unlimited ? 'Set a limit' : 'Set to unlimited'}
                  disabled={disabled}
                  onClick={() => toggleUnlimited(key)}
                  className={cn(
                    'rounded-md px-1.5 py-1.5 text-[10px] font-medium flex-shrink-0 border transition-colors',
                    unlimited
                      ? 'bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200'
                      : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200',
                  )}
                >
                  ∞
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
