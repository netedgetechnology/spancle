'use client';

import { useRouter } from 'next/navigation';
import { formatPrice, type SubscriptionStatus } from '@/types/subscription.types';

interface UpgradeCtaProps {
  currentStatus: SubscriptionStatus;
  currentTier:   string;
  /** If true, renders as a compact banner instead of a card */
  compact?:      boolean;
}

interface TierMeta {
  name:          string;
  priceMontly:   number;
  priceAnnual:   number;
  currency:      string;
  headline:      string;
  ctaLabel:      string;
  ctaHref:       string;
  highlights:    string[];
}

/**
 * Upgrade path from each tier to the next.
 * Enterprise has no "next" — shows contact sales path instead.
 */
const UPGRADE_PATH: Record<string, TierMeta> = {
  free: {
    name:        'Starter',
    priceMontly:  2900,
    priceAnnual:  29000,
    currency:     'GBP',
    headline:     'Ready to grow?',
    ctaLabel:     'Start free trial',
    ctaHref:      '/subscription/upgrade?tier=starter',
    highlights:   ['Up to 25 users', 'API access', 'Data export', '14-day free trial'],
  },
  starter: {
    name:        'Growth',
    priceMontly:  7900,
    priceAnnual:  79000,
    currency:     'GBP',
    headline:     'Unlock more features',
    ctaLabel:     'Upgrade to Growth',
    ctaHref:      '/subscription/upgrade?tier=growth',
    highlights:   ['Up to 100 users', 'Custom branding', 'Webhooks', 'Multi-academy support'],
  },
  growth: {
    name:        'Pro',
    priceMontly:  19900,
    priceAnnual:  199000,
    currency:     'GBP',
    headline:     'Get the full platform',
    ctaLabel:     'Upgrade to Pro',
    ctaHref:      '/subscription/upgrade?tier=pro',
    highlights:   ['Up to 500 users', 'Advanced analytics', 'Custom roles', 'Priority support'],
  },
  pro: {
    name:        'Enterprise',
    priceMontly:  0,
    priceAnnual:  0,
    currency:     'GBP',
    headline:     'Need unlimited scale?',
    ctaLabel:     'Contact sales',
    ctaHref:      '/subscription/upgrade?tier=enterprise',
    highlights:   ['Unlimited users', 'SSO / SAML', 'Dedicated support', 'Custom SLA'],
  },
};

/**
 * UpgradeCta — contextual upgrade prompt.
 *
 * Hidden when:
 *   - currentTier is 'enterprise' (no higher tier exists)
 *   - status is 'cancelled' or 'expired' (tenant needs to re-subscribe, not upgrade)
 *
 * Shows:
 *   - Next tier name and monthly/annual price
 *   - 4 key upgrade highlights
 *   - Primary CTA button routing to the upgrade flow
 */
export function UpgradeCta({
  currentStatus,
  currentTier,
  compact = false,
}: UpgradeCtaProps): React.ReactElement | null {
  const router = useRouter();
  const meta   = UPGRADE_PATH[currentTier];

  // Nothing to show
  if (!meta)                                       return null;
  if (currentStatus === 'cancelled')               return null;
  if (currentStatus === 'expired')                 return null;
  if (currentTier   === 'enterprise')              return null;

  const isEnterprise = meta.name === 'Enterprise';
  const monthlyLabel = isEnterprise
    ? 'Custom pricing'
    : formatPrice(meta.priceMontly, meta.currency) + '/mo';
  const annualLabel  = isEnterprise
    ? null
    : formatPrice(meta.priceAnnual, meta.currency) + '/yr';

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 rounded-xl border border-primary-100 bg-primary-50 px-4 py-3">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{meta.headline}</span>
          {' '}Upgrade to <span className="font-semibold text-primary-700">{meta.name}</span>
          {!isEnterprise && ` from ${monthlyLabel}`}.
        </p>
        <button
          type="button"
          onClick={() => router.push(meta.ctaHref)}
          className="flex-shrink-0 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {meta.ctaLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-indigo-50 overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">

          {/* Left: headline + price */}
          <div className="flex-1">
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">
              Upgrade available
            </p>
            <h4 className="text-lg font-bold text-gray-900">{meta.headline}</h4>
            <p className="text-sm text-gray-600 mt-1">
              Move to{' '}
              <span className="font-semibold text-gray-800">{meta.name}</span>
              {!isEnterprise && (
                <>
                  {' '}for {monthlyLabel}
                  {annualLabel && (
                    <span className="text-gray-400 ml-1.5">
                      or {annualLabel} (save ~20%)
                    </span>
                  )}
                </>
              )}
            </p>

            {/* Highlights */}
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
              {meta.highlights.map((h) => (
                <li key={h} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg
                    className="h-4 w-4 text-primary-500 flex-shrink-0"
                    fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {h}
                </li>
              ))}
            </ul>
          </div>

          {/* Right: CTA */}
          <div className="flex-shrink-0 flex flex-col items-start sm:items-end gap-2">
            <button
              type="button"
              onClick={() => router.push(meta.ctaHref)}
              className="rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
            >
              {meta.ctaLabel}
            </button>
            {!isEnterprise && (
              <p className="text-xs text-gray-400">No credit card required for trial</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
