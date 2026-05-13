/**
 * Tenant Constants
 * Multi-tenancy configuration and limits.
 */

export const TENANT_HEADER = 'x-tenant-id' as const;

export const TENANT_RESOLUTION_STRATEGIES = {
  HEADER:    'header',
  SUBDOMAIN: 'subdomain',
  PATH:      'path',
  JWT:       'jwt',
} as const;

export type TenantResolutionStrategy =
  typeof TENANT_RESOLUTION_STRATEGIES[keyof typeof TENANT_RESOLUTION_STRATEGIES];

export const TENANT_STATUS = {
  PENDING:    'pending',
  ACTIVE:     'active',
  SUSPENDED:  'suspended',
  TERMINATED: 'terminated',
  TRIAL:      'trial',
} as const;

export type TenantStatus = typeof TENANT_STATUS[keyof typeof TENANT_STATUS];

export const TENANT_TIERS = {
  FREE:       'free',
  STARTER:    'starter',
  GROWTH:     'growth',
  PRO:        'pro',
  ENTERPRISE: 'enterprise',
} as const;

export type TenantTier = typeof TENANT_TIERS[keyof typeof TENANT_TIERS];

export const TENANT_LIMITS = {
  [TENANT_TIERS.FREE]:       { users: 5,    storage_gb: 1,    api_calls_per_day: 1_000 },
  [TENANT_TIERS.STARTER]:    { users: 25,   storage_gb: 10,   api_calls_per_day: 10_000 },
  [TENANT_TIERS.GROWTH]:     { users: 100,  storage_gb: 50,   api_calls_per_day: 50_000 },
  [TENANT_TIERS.PRO]:        { users: 500,  storage_gb: 200,  api_calls_per_day: 200_000 },
  [TENANT_TIERS.ENTERPRISE]: { users: -1,   storage_gb: -1,   api_calls_per_day: -1 }, // -1 = unlimited
} as const satisfies Record<TenantTier, { users: number; storage_gb: number; api_calls_per_day: number }>;
