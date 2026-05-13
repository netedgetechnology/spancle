export type PackageStatus = 'draft' | 'active' | 'deprecated' | 'archived';
export type BillingCycle  = 'monthly' | 'annual' | 'one_time' | 'custom';

// ── Feature flags (mirrors PlanFeatureFlags) ──────────────────────────────────

export interface PackageFeatures {
  customBranding:    boolean;
  advancedAnalytics: boolean;
  apiAccess:         boolean;
  webhooks:          boolean;
  multiAcademy:      boolean;
  prioritySupport:   boolean;
  auditLogAccess:    boolean;
  customRoles:       boolean;
  dataExport:        boolean;
  ssoIntegration:    boolean;
}

// ── Resource limits (mirrors PlanResourceLimits) ──────────────────────────────
// -1 = unlimited

export interface PackageLimits {
  maxUsers:               number;
  maxStorageGb:           number;
  maxApiCallsPerDay:      number;
  maxConcurrentBookings:  number;
  maxActiveTournaments:   number;
  maxAcademies:           number;
  maxPlayersPerAcademy:   number;
  maxNotificationsPerDay: number;
  maxReportsPerDay:       number;
}

// ── Full package response shape ───────────────────────────────────────────────

export interface Package {
  id:                     string;
  slug:                   string;
  name:                   string;
  description:            string | null;
  tierKey:                string;
  status:                 PackageStatus;
  priceMonthlyMinorUnits: number;
  priceAnnualMinorUnits:  number;
  currency:               string;
  trialDays:              number;
  features:               Partial<PackageFeatures>;
  limits:                 Partial<PackageLimits>;
  highlightFeatures:      string[] | null;
  badgeText:              string | null;
  isHighlighted:          boolean;
  sortOrder:              number;
  metadata:               Record<string, unknown> | null;
  publishedAt:            string | null;
  deprecatedAt:           string | null;
  createdAt:              string;
  updatedAt:              string;
}

// ── Form input shape ──────────────────────────────────────────────────────────

export interface PackageFormValues {
  name:                   string;
  slug:                   string;
  description:            string;
  tierKey:                string;
  priceMonthlyMinorUnits: number;
  priceAnnualMinorUnits:  number;
  currency:               string;
  trialDays:              number;
  features:               PackageFeatures;
  limits:                 PackageLimits;
  highlightFeatures:      string[];
  badgeText:              string;
  isHighlighted:          boolean;
  sortOrder:              number;
}

// ── Display helpers ───────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<PackageStatus, { label: string; bg: string; text: string }> = {
  draft:      { label: 'Draft',      bg: 'bg-gray-100',   text: 'text-gray-700'   },
  active:     { label: 'Active',     bg: 'bg-emerald-100', text: 'text-emerald-700' },
  deprecated: { label: 'Deprecated', bg: 'bg-amber-100',  text: 'text-amber-700'  },
  archived:   { label: 'Archived',   bg: 'bg-red-100',    text: 'text-red-700'    },
};

export const TIER_ORDER = ['free', 'starter', 'growth', 'pro', 'enterprise'] as const;

export const FEATURE_LABELS: Record<keyof PackageFeatures, string> = {
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

export const LIMIT_LABELS: Record<keyof PackageLimits, { label: string; unit: string }> = {
  maxUsers:               { label: 'Users',             unit: 'users'     },
  maxStorageGb:           { label: 'Storage',           unit: 'GB'        },
  maxApiCallsPerDay:      { label: 'API calls/day',     unit: 'calls'     },
  maxConcurrentBookings:  { label: 'Concurrent bookings', unit: 'bookings' },
  maxActiveTournaments:   { label: 'Active tournaments', unit: 'events'   },
  maxAcademies:           { label: 'Academies',          unit: 'academies' },
  maxPlayersPerAcademy:   { label: 'Players/academy',    unit: 'players'  },
  maxNotificationsPerDay: { label: 'Notifications/day',  unit: 'msgs'     },
  maxReportsPerDay:       { label: 'Reports/day',        unit: 'reports'  },
};

export function formatPrice(minorUnits: number, currency = 'GBP'): string {
  if (minorUnits === 0) return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

export function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited';
  return value.toLocaleString();
}
