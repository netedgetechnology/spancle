/**
 * admin.types.ts — Frontend type definitions for the superadmin dashboard.
 *
 * These are explicit mirrors of the backend AdminStatsResponse — not imports.
 * Frontend/backend boundary is intentional; any API change must be
 * reflected here manually.
 */

// ── Tenant ────────────────────────────────────────────────────────────────────

export type TenantStatus = 'active' | 'trial' | 'suspended' | 'terminated' | 'pending';
export type TenantTier   = 'free' | 'starter' | 'growth' | 'pro' | 'enterprise';

export interface TenantStats {
  total:          number;
  active:         number;
  trial:          number;
  suspended:      number;
  terminated:     number;
  pending:        number;
  newThisPeriod:  number;
  previousPeriod: number;
}

export interface TierCount {
  tier:  TenantTier | string;
  count: number;
}

export interface RecentTenant {
  id:        string;
  name:      string;
  slug:      string;
  email:     string;
  status:    TenantStatus;
  tier:      TenantTier;
  createdAt: string;
}

// ── Revenue ───────────────────────────────────────────────────────────────────

export interface RevenueStats {
  mrrMinorUnits:         number;
  currency:              string;
  previousMrrMinorUnits: number;
  isStub:                true;
}

// ── Monthly trend ─────────────────────────────────────────────────────────────

export interface MonthlyDataPoint {
  month:             string;
  tenantCount:       number;
  trialCount:        number;
  revenueMinorUnits: number;
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export interface BookingStats {
  totalThisPeriod:     number;
  confirmedThisPeriod: number;
  cancelledThisPeriod: number;
  isStub:              true;
}

// ── Support tickets ───────────────────────────────────────────────────────────

export interface SupportTicketStats {
  open:     number;
  pending:  number;
  resolved: number;
  isStub:   true;
}

// ── Trial stats ───────────────────────────────────────────────────────────────

export interface TrialAgeBucket {
  label:   string;
  count:   number;
  minDays: number;
  maxDays: number;
}

export interface TrialStats {
  total:                number;
  expiringSoon:         number;
  convertedThisPeriod:  number;
  expiredThisPeriod:    number;
  conversionRatePct:    number | null;
  ageBuckets:           TrialAgeBucket[];
}

// ── Subscription stats ────────────────────────────────────────────────────────

export interface SubscriptionByTier {
  tier:          string;
  count:         number;
  mrrMinorUnits: number;
}

export interface SubscriptionStats {
  totalPaying:       number;
  newThisPeriod:     number;
  churnedThisPeriod: number;
  churnRatePct:      number | null;
  byTier:            SubscriptionByTier[];
  isProxy:           true;
}

// ── Root response ─────────────────────────────────────────────────────────────

export interface AdminStats {
  computedAt:        string;
  periodDays:        number;
  tenants:           TenantStats;
  tierBreakdown:     TierCount[];
  revenue:           RevenueStats;
  monthlyTrend:      MonthlyDataPoint[];
  bookings:          BookingStats;
  supportTickets:    SupportTicketStats;
  recentTenants:     RecentTenant[];
  trialStats:        TrialStats;
  subscriptionStats: SubscriptionStats;
}

// ── Tenant list response (from identity-service) ───────────────────────────────

export interface TenantListItem {
  id:        string;
  name:      string;
  slug:      string;
  email:     string;
  status:    TenantStatus;
  tier:      TenantTier;
  createdAt: string;
  updatedAt: string;
}

export interface TenantListResponse {
  data:  TenantListItem[];
  total: number;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export type DeltaDirection = 'up' | 'down' | 'neutral';

export interface StatCardData {
  label:       string;
  value:       string | number;
  delta?:      number;         // percentage change vs previous period
  direction?:  DeltaDirection;
  prefix?:     string;
  suffix?:     string;
  isStub?:     boolean;
}

export const TIER_COLORS: Record<string, string> = {
  free:       '#e5e7eb',
  starter:    '#bfdbfe',
  growth:     '#6ee7b7',
  pro:        '#818cf8',
  enterprise: '#fbbf24',
};

export const STATUS_COLORS: Record<TenantStatus, string> = {
  active:     '#10b981',
  trial:      '#3b82f6',
  suspended:  '#f59e0b',
  terminated: '#ef4444',
  pending:    '#8b5cf6',
};
