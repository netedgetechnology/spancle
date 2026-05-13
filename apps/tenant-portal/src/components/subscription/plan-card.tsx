'use client';

import { cn } from '@/lib/utils/cn';
import {
  STATUS_CONFIG,
  FEATURE_LABELS,
  LIMIT_LABELS,
  formatPrice,
  formatLimit,
  daysRemaining,
  type Subscription,
} from '@/types/subscription.types';

interface PlanCardProps {
  subscription: Subscription;
  onCancel?:    () => void;
  isCancelling?: boolean;
}

// ── Feature row ───────────────────────────────────────────────────────────────

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }): React.ReactElement {
  return (
    <li className={cn('flex items-center gap-2 text-sm', enabled ? 'text-gray-800' : 'text-gray-400')}>
      {enabled ? (
        <svg
          className="h-4 w-4 text-emerald-500 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
          aria-label="Included"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      ) : (
        <svg
          className="h-4 w-4 text-gray-300 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          aria-label="Not included"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {label}
    </li>
  );
}

// ── Trial countdown ────────────────────────────────────────────────────────────

function TrialCountdown({ trialEnd }: { trialEnd: string }): React.ReactElement {
  const days    = daysRemaining(trialEnd);
  const urgent  = days <= 3;
  const endDate = new Date(trialEnd).toLocaleDateString(undefined, { dateStyle: 'medium' });

  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-center',
        urgent ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50',
      )}
      role="status"
      aria-label={`Trial ends in ${days} days`}
    >
      <p className={cn('text-3xl font-bold tabular-nums', urgent ? 'text-red-700' : 'text-blue-700')}>
        {days}
      </p>
      <p className={cn('text-xs font-medium mt-0.5', urgent ? 'text-red-500' : 'text-blue-500')}>
        {days === 1 ? 'day remaining' : 'days remaining'}
      </p>
      <p className="text-xs text-gray-500 mt-1">Trial ends {endDate}</p>
      {urgent && (
        <p className="text-xs font-semibold text-red-600 mt-2">
          Upgrade now to avoid service interruption
        </p>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

/**
 * PlanCard — displays the tenant's current subscription in full.
 *
 * Sections:
 *   Header    — tier name, status badge, price, renewal date
 *   Trial     — countdown widget (shown only during trial)
 *   Features  — enabled / disabled feature list from snapshot
 *   Limits    — key resource limits from snapshot
 *   Footer    — cancel button (shown when active or trialing)
 *
 * Uses the `featuresSnapshot` and `limitsSnapshot` stored at subscribe time
 * so the displayed values are always accurate to what the tenant purchased,
 * regardless of subsequent package updates.
 */
export function PlanCard({
  subscription,
  onCancel,
  isCancelling = false,
}: PlanCardProps): React.ReactElement {
  const sc         = STATUS_CONFIG[subscription.status];
  const isTrialing = subscription.status === 'trialing';
  const canCancel  = subscription.status === 'active' || subscription.status === 'trialing';

  const periodEnd = new Date(subscription.periodEnd).toLocaleDateString(
    undefined,
    { dateStyle: 'medium' },
  );

  // Build feature list from snapshot
  const featureEntries = Object.entries(FEATURE_LABELS).map(([key, label]) => ({
    label,
    enabled: subscription.featuresSnapshot[key] === true,
  }));

  // Build limit list from snapshot (only keys with a label)
  const limitEntries = Object.entries(LIMIT_LABELS)
    .map(([key, meta]) => ({
      label: meta.label,
      unit:  meta.unit,
      value: subscription.limitsSnapshot[key] ?? 0,
    }))
    .filter((e) => e.value !== undefined);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-xl font-bold text-gray-900 capitalize">
                {subscription.tierKey} Plan
              </h3>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                  sc.bg, sc.text,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', sc.dot)} aria-hidden="true" />
                {sc.label}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="font-semibold text-gray-900">
                {formatPrice(subscription.priceMinorUnits, subscription.currency)}
                <span className="text-xs font-normal text-gray-400 ml-0.5">
                  /{subscription.billingCycle === 'annual' ? 'yr' : 'mo'}
                </span>
              </span>
              {!isTrialing && (
                <span>Renews {periodEnd}</span>
              )}
              {subscription.billingCycle === 'annual' && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  Annual billing
                </span>
              )}
            </div>
          </div>

          {/* Billing cycle badge */}
          <div className="text-right">
            <p className="text-xs text-gray-400">Package ID</p>
            <p className="text-xs font-mono text-gray-500 mt-0.5">
              {subscription.packageId.slice(0, 8)}…
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* ── Trial countdown (only during trial) ─────────────────────────── */}
        {isTrialing && subscription.trialEnd && (
          <TrialCountdown trialEnd={subscription.trialEnd} />
        )}

        {/* ── Feature list + Resource limits ──────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Features */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Included features
            </p>
            <ul className="space-y-2">
              {featureEntries.map((f) => (
                <FeatureRow key={f.label} label={f.label} enabled={f.enabled} />
              ))}
            </ul>
          </div>

          {/* Resource limits */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Resource limits
            </p>
            <dl className="space-y-2.5">
              {limitEntries.map(({ label, unit, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="text-sm text-gray-600">{label}</dt>
                  <dd className="text-sm font-semibold text-gray-900 tabular-nums">
                    {formatLimit(value)}
                    {value !== -1 && unit ? (
                      <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* ── Cancellation info ────────────────────────────────────────────── */}
        {subscription.cancelledAt && (
          <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
            <p className="font-medium text-gray-700">Subscription cancelled</p>
            <p className="mt-0.5 text-xs">
              Access continues until{' '}
              <span className="font-medium">{periodEnd}</span>.
              {subscription.cancelReason && ` Reason: "${subscription.cancelReason}"`}
            </p>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      {canCancel && onCancel && (
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Cancellation takes effect at the end of your billing period.
          </p>
          <button
            type="button"
            onClick={onCancel}
            disabled={isCancelling}
            className="text-xs font-medium text-red-500 hover:text-red-600 hover:underline disabled:opacity-50 focus:outline-none"
          >
            {isCancelling ? 'Cancelling…' : 'Cancel subscription'}
          </button>
        </div>
      )}
    </div>
  );
}
