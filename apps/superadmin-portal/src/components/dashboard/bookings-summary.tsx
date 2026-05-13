import type { BookingStats } from '@/types/admin.types';

interface BookingsSummaryProps {
  data:       BookingStats;
  periodDays: number;
  isLoading?: boolean;
}

/**
 * BookingsSummary — platform-wide booking stats widget.
 *
 * Sprint 1: Data is stubbed at the service layer (all zeros).
 * Sprint 3: Real values sourced from Redis event-driven booking counters
 * aggregated across all tenant booking-service instances.
 *
 * Displays:
 *   - Total bookings in the period
 *   - Confirmed vs cancelled breakdown with visual bar
 *   - Clear "pending integration" badge so operators are not misled
 */
export function BookingsSummary({
  data,
  periodDays,
  isLoading = false,
}: BookingsSummaryProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-36 rounded bg-gray-200 mb-4" />
        <div className="h-10 w-16 rounded bg-gray-200 mb-3" />
        <div className="h-2 rounded-full bg-gray-100 mb-2" />
        <div className="h-3 w-24 rounded bg-gray-100" />
      </div>
    );
  }

  const total     = data.totalThisPeriod;
  const confirmed = data.confirmedThisPeriod;
  const cancelled = data.cancelledThisPeriod;
  const confirmedPct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const cancelledPct = total > 0 ? Math.round((cancelled / total) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          Bookings — {periodDays}d
        </p>
        {data.isStub && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 flex-shrink-0">
            Sprint 3
          </span>
        )}
      </div>

      {/* Primary metric */}
      <p className="text-3xl font-bold text-gray-900 mb-1">
        {total.toLocaleString()}
      </p>
      <p className="text-xs text-gray-400 mb-4">total bookings this period</p>

      {/* Breakdown bar */}
      {total > 0 ? (
        <div className="space-y-3">
          <div
            className="h-2 w-full rounded-full bg-gray-100 overflow-hidden"
            role="progressbar"
            aria-label={`${confirmedPct}% confirmed`}
          >
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${confirmedPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" aria-hidden="true" />
              {confirmed.toLocaleString()} confirmed ({confirmedPct}%)
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="h-2 w-2 rounded-full bg-red-300 inline-block" aria-hidden="true" />
              {cancelled.toLocaleString()} cancelled ({cancelledPct}%)
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 py-4 text-center">
          <p className="text-xs text-gray-400">
            {data.isStub
              ? 'Cross-service booking aggregation not yet integrated'
              : 'No bookings in this period'
            }
          </p>
        </div>
      )}
    </div>
  );
}
