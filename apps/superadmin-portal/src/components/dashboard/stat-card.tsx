import { cn } from '@/lib/utils/cn';
import type { StatCardData } from '@/types/admin.types';

interface StatCardProps extends StatCardData {
  isLoading?: boolean;
}

/**
 * StatCard — a single KPI metric card.
 *
 * Displays:
 *   - Large primary value (number, currency, or percentage)
 *   - Descriptive label
 *   - Optional delta vs previous period with directional colour
 *   - Stub badge when data is a placeholder
 *   - Skeleton loading state with fixed dimensions to prevent layout shift
 *
 * Used in a responsive grid on the dashboard — 1 col mobile, 2 tablet, 4 desktop.
 */
export function StatCard({
  label,
  value,
  delta,
  direction,
  prefix,
  suffix,
  isStub,
  isLoading = false,
}: StatCardProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-3.5 w-24 rounded bg-gray-200 mb-3" />
        <div className="h-8 w-20 rounded bg-gray-200 mb-2" />
        <div className="h-3 w-16 rounded bg-gray-100" />
      </div>
    );
  }

  const deltaColor =
    direction === 'up'      ? 'text-emerald-600' :
    direction === 'down'    ? 'text-red-500' :
    'text-gray-400';

  const deltaIcon =
    direction === 'up'   ? '↑' :
    direction === 'down' ? '↓' : '→';

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {isStub && (
        <span className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          Coming soon
        </span>
      )}

      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>

      <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        {prefix && <span className="text-xl font-semibold text-gray-500 mr-0.5">{prefix}</span>}
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span className="text-lg font-medium text-gray-400 ml-1">{suffix}</span>}
      </p>

      {delta !== undefined && direction && (
        <p className={cn('mt-1.5 flex items-center gap-1 text-xs font-medium', deltaColor)}>
          <span aria-hidden="true">{deltaIcon}</span>
          <span>
            {Math.abs(delta)}% vs last period
          </span>
        </p>
      )}

      {delta === null && (
        <p className="mt-1.5 text-xs text-gray-400">No previous data</p>
      )}
    </div>
  );
}
