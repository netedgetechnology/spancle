/**
 * admin.api.ts — API call functions for the superadmin dashboard.
 *
 * All calls go through apiClient which:
 *   - Attaches Authorization: Bearer from NextAuth session
 *   - Attaches x-tenant-id header (required by all NestJS services)
 *   - Handles 401 → redirect to /login
 *
 * The stats endpoint is in saas-platform-service (port 3002 in dev).
 * The tenant list endpoint is in identity-service (port 3001 in dev).
 * In production, both are routed via nginx /api/v1/* → upstream.
 */
import { apiClient } from '@/lib/api/client';
import type {
  AdminStats,
  TenantListResponse,
  TenantStatus,
  TenantTier,
} from '@/types/admin.types';

// ── Query key factory ─────────────────────────────────────────────────────────

export const adminKeys = {
  all:        () => ['admin'] as const,
  stats:      (period: number) => [...adminKeys.all(), 'stats', period] as const,
  tenants:    () => [...adminKeys.all(), 'tenants'] as const,
  tenantList: (page: number, limit: number, status?: string, tier?: string) =>
    [...adminKeys.tenants(), { page, limit, status, tier }] as const,
} as const;

// ── Stats ──────────────────────────────────────────────────────────────────────

/**
 * Fetches aggregated platform statistics.
 * Calls saas-platform-service GET /api/v1/admin/stats
 */
export async function fetchAdminStats(periodDays = 30): Promise<AdminStats> {
  const res = await apiClient.get<AdminStats>('/api/v1/admin/stats', {
    params: { period: periodDays },
  });
  return res.data;
}

// ── Tenants ────────────────────────────────────────────────────────────────────

/**
 * Fetches tenant list with optional filters.
 * Calls identity-service GET /api/v1/tenants
 */
export async function fetchTenants(params: {
  page?:   number;
  limit?:  number;
  status?: TenantStatus;
  tier?:   TenantTier;
} = {}): Promise<TenantListResponse> {
  const res = await apiClient.get<TenantListResponse>('/tenants', { params });
  return res.data;
}

/**
 * Activates a suspended or pending tenant.
 */
export async function activateTenant(tenantId: string): Promise<void> {
  await apiClient.post(`/tenants/${tenantId}/activate`, {});
}

/**
 * Suspends an active tenant.
 */
export async function suspendTenant(tenantId: string, reason: string): Promise<void> {
  await apiClient.post(`/tenants/${tenantId}/suspend`, { reason });
}

// ── Formatting helpers ─────────────────────────────────────────────────────────

/**
 * Formats minor currency units to a display string.
 * e.g. 2999 pence → "£29.99"
 */
export function formatCurrency(minorUnits: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', {
    style:    'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

/**
 * Computes percentage delta between current and previous values.
 * Returns null if previous is 0 (avoid division by zero).
 */
export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Formats a number with K/M suffix for compact display.
 * e.g. 1500 → "1.5K"
 */
export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
