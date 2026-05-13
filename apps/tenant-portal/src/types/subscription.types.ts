/**
 * subscription.types.ts
 *
 * Frontend type mirror of the backend SubscriptionEntity and EffectiveLimits.
 * Deliberately not imported from the backend — frontend/backend boundary is explicit.
 */

// ── Subscription state machine ─────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'paused';

export type SubscriptionBillingCycle = 'monthly' | 'annual' | 'one_time' | 'custom';

// ── API response shapes ────────────────────────────────────────────────────────

export interface Subscription {
  id:               string;
  tenantId:         string;
  packageId:        string;
  tierKey:          string;
  status:           SubscriptionStatus;
  billingCycle:     SubscriptionBillingCycle;
  priceMinorUnits:  number;
  currency:         string;
  periodStart:      string;
  periodEnd:        string;
  trialEnd:         string | null;
  cancelledAt:      string | null;
  cancelReason:     string | null;
  /** Feature flags snapshot copied from the package at subscribe time */
  featuresSnapshot: Record<string, boolean>;
  /** Resource limits snapshot copied from the package at subscribe time */
  limitsSnapshot:   Record<string, number>;
  externalSubId:    string | null;
  createdAt:        string;
  updatedAt:        string;
}

export interface EffectiveLimits {
  tierKey:  string;
  features: Record<string, boolean>;
  limits:   Record<string, number>;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  SubscriptionStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  trialing:  { label: 'Trial',     bg: 'bg-blue-50',    text: 'text-blue-700',    dot: 'bg-blue-500'   },
  active:    { label: 'Active',    bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  past_due:  { label: 'Past Due',  bg: 'bg-red-50',     text: 'text-red-700',     dot: 'bg-red-500'    },
  cancelled: { label: 'Cancelled', bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400'   },
  expired:   { label: 'Expired',   bg: 'bg-gray-100',   text: 'text-gray-600',    dot: 'bg-gray-400'   },
  paused:    { label: 'Paused',    bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-500'  },
};

export const FEATURE_LABELS: Record<string, string> = {
  customBranding:    'Custom Branding',
  advancedAnalytics: 'Advanced Analytics',
  apiAccess:         'API Access',
  webhooks:          'Webhooks',
  multiAcademy:      'Multi-Academy',
  prioritySupport:   'Priority Support',
  auditLogAccess:    'Audit Log Access',
  customRoles:       'Custom Roles',
  dataExport:        'Data Export',
  ssoIntegration:    'SSO / SAML',
};

export const LIMIT_LABELS: Record<string, { label: string; unit: string }> = {
  maxUsers:               { label: 'Users',               unit: ''         },
  maxStorageGb:           { label: 'Storage',             unit: 'GB'       },
  maxApiCallsPerDay:      { label: 'API calls / day',     unit: ''         },
  maxConcurrentBookings:  { label: 'Concurrent bookings', unit: ''         },
  maxActiveTournaments:   { label: 'Active tournaments',  unit: ''         },
  maxAcademies:           { label: 'Academies',           unit: ''         },
  maxPlayersPerAcademy:   { label: 'Players / academy',   unit: ''         },
  maxNotificationsPerDay: { label: 'Notifications / day', unit: ''         },
  maxReportsPerDay:       { label: 'Reports / day',       unit: ''         },
};

// ── Formatting helpers ─────────────────────────────────────────────────────────

export function formatPrice(minorUnits: number, currency = 'GBP'): string {
  if (minorUnits === 0) return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

export function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited';
  return value.toLocaleString();
}

export function daysRemaining(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}
