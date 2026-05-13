/**
 * subscription.api.ts
 *
 * Typed API call functions for the tenant subscription management module.
 * All calls go through apiClient which injects Authorization + x-tenant-id headers.
 *
 * Endpoints:
 *   GET  /api/v1/subscriptions/current       → active subscription for tenant
 *   GET  /api/v1/subscriptions               → full subscription history
 *   POST /api/v1/subscriptions               → create/subscribe to package
 *   POST /api/v1/subscriptions/:id/cancel    → cancel active subscription
 *   GET  /api/v1/plans/current/effective-limits → resolved features + limits
 */
import { apiClient } from '@/lib/api/client';
import type { Subscription, EffectiveLimits } from '@/types/subscription.types';

const SUB_BASE  = '/api/v1/subscriptions';
const PLAN_BASE = '/api/v1/plans';

// ── Query key factory ──────────────────────────────────────────────────────────

export const subscriptionKeys = {
  all:     () => ['subscription'] as const,
  current: () => [...subscriptionKeys.all(), 'current'] as const,
  history: () => [...subscriptionKeys.all(), 'history'] as const,
  limits:  () => [...subscriptionKeys.all(), 'limits'] as const,
} as const;

// ── API functions ──────────────────────────────────────────────────────────────

/**
 * Returns the tenant's current active/trialing subscription.
 * Returns null when no active subscription exists.
 */
export async function fetchCurrentSubscription(): Promise<Subscription | null> {
  const res = await apiClient.get<Subscription | null>(`${SUB_BASE}/current`);
  return res.data;
}

/**
 * Returns full subscription history (all statuses, most recent first).
 */
export async function fetchSubscriptionHistory(): Promise<Subscription[]> {
  const res = await apiClient.get<Subscription[]>(SUB_BASE);
  return res.data;
}

/**
 * Returns the resolved effective limits for the current tenant.
 * Merges package limits with any superadmin limit overrides.
 */
export async function fetchEffectiveLimits(): Promise<EffectiveLimits> {
  const res = await apiClient.get<EffectiveLimits>(`${PLAN_BASE}/current/effective-limits`);
  return res.data;
}

/**
 * Subscribes a tenant to a package.
 * Creates a new subscription — requires no existing active subscription.
 */
export async function createSubscription(
  packageId:    string,
  billingCycle: 'monthly' | 'annual' = 'monthly',
): Promise<Subscription> {
  const res = await apiClient.post<Subscription>(SUB_BASE, { packageId, billingCycle });
  return res.data;
}

/**
 * Cancels the active subscription. Requires a cancellation reason.
 * Access continues until the current period ends.
 */
export async function cancelSubscription(
  subscriptionId: string,
  reason:         string,
): Promise<Subscription> {
  const res = await apiClient.post<Subscription>(
    `${SUB_BASE}/${subscriptionId}/cancel`,
    { reason },
  );
  return res.data;
}
