import { apiClient } from '@/lib/api/client';

const REPORTING_BASE =
  typeof window === 'undefined'
    ? (process.env['REPORTING_SERVICE_URL']        ?? 'http://localhost:3008')
    : (process.env['NEXT_PUBLIC_REPORTING_URL']    ?? 'http://localhost:3008');

const BASE = `${REPORTING_BASE}/api/v1/analytics`;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AnalyticsDateRange {
  from:        string;   // YYYY-MM-DD
  to:          string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  branchId?:   string;
  courtId?:    string;
  sportId?:    string;
}

export interface OccupancyPeriod {
  period:            string;
  totalSlots:        number;
  bookedSlots:       number;
  availableSlots:    number;
  reservedSlots:     number;
  completedSlots:    number;
  cancelledSlots:    number;
  utilizationPct:    number;
  revenueMinor:      number;
}

export interface CourtOccupancyRow {
  courtId:           string;
  branchId:          string;
  totalSlots:        number;
  bookedSlots:       number;
  utilizationPct:    number;
  revenueMinor:      number;
  avgDurationMins:   number;
}

export interface OccupancySummary {
  from:                    string;
  to:                      string;
  totalSlots:              number;
  totalBooked:             number;
  overallUtilizationPct:   number;
  totalRevenueMinor:       number;
  byPeriod:                OccupancyPeriod[];
  byCourt:                 CourtOccupancyRow[];
}

export interface CourtUtilizationRow {
  courtId:               string;
  branchId:              string;
  totalSlotsGenerated:   number;
  totalSlotsBooked:      number;
  totalSlotsAvailable:   number;
  utilizationPct:        number;
  totalDurationMinsBooked: number;
  avgDurationMins:       number;
  totalRevenueMinor:     number;
  bookingCount:          number;
  avgBookingValueMinor:  number;
}

export interface CourtUtilizationSummary {
  from:               string;
  to:                 string;
  totalCourts:        number;
  totalRevenueMinor:  number;
  totalBookings:      number;
  avgUtilizationPct:  number;
  courts:             CourtUtilizationRow[];
}

export interface PeakHourRow {
  hourOfDay:         number;
  dayOfWeek:         number;
  dayName:           string;
  slotCount:         number;
  bookedCount:       number;
  utilizationPct:    number;
  revenueMinor:      number;
}

export interface PeakHourSummary {
  from:              string;
  to:                string;
  busiestHour:       number;
  busiestHourLabel:  string;
  busiestDay:        string;
  quietestHour:      number;
  quietestHourLabel: string;
  byHour:            PeakHourRow[];
  heatmap:           PeakHourRow[];
}

export interface CancellationPeriod {
  period:              string;
  totalCancellations:  number;
  cancelledByAdmin:    number;
  cancelledByCustomer: number;
  cancellationRate:    number;
  revenueImpactMinor:  number;
}

export interface CancellationReasonRow {
  reason:             string | null;
  count:              number;
  pct:                number;
  revenueImpactMinor: number;
}

export interface CancellationSummary {
  from:                    string;
  to:                      string;
  totalCancellations:      number;
  cancellationRate:        number;
  totalRevenueImpactMinor: number;
  avgCancellationLeadHours: number;
  byPeriod:                CancellationPeriod[];
  byReason:                CancellationReasonRow[];
}

export interface NoShowPeriod {
  period:            string;
  totalBookings:     number;
  noShows:           number;
  noShowRate:        number;
  waived:            number;
  revenueAtRiskMinor: number;
}

export interface NoShowCourtRow {
  courtId:            string;
  branchId:           string;
  totalBookings:      number;
  noShows:            number;
  noShowRate:         number;
  isHighRisk:         boolean;
  revenueAtRiskMinor: number;
}

export interface NoShowSummary {
  from:               string;
  to:                 string;
  totalBookings:      number;
  totalNoShows:       number;
  overallNoShowRate:  number;
  totalWaived:        number;
  revenueAtRiskMinor: number;
  byPeriod:           NoShowPeriod[];
  byCourt:            NoShowCourtRow[];
  highRiskCourts:     NoShowCourtRow[];
}

// ── Query key factory ─────────────────────────────────────────────────────────

export const analyticsKeys = {
  all:               ()                              => ['analytics']                                as const,
  occupancy:         (p: AnalyticsDateRange)         => [...analyticsKeys.all(), 'occupancy',   p]  as const,
  courtUtilization:  (p: AnalyticsDateRange)         => [...analyticsKeys.all(), 'court-util',  p]  as const,
  peakHours:         (p: AnalyticsDateRange)         => [...analyticsKeys.all(), 'peak-hours',  p]  as const,
  cancellations:     (p: AnalyticsDateRange)         => [...analyticsKeys.all(), 'cancellations', p] as const,
  noShows:           (p: AnalyticsDateRange)         => [...analyticsKeys.all(), 'no-shows',    p]  as const,
} as const;

// ── Fetch functions ───────────────────────────────────────────────────────────

function toParams(p: AnalyticsDateRange): Record<string, string> {
  const q: Record<string, string> = { from: p.from, to: p.to };
  if (p.granularity) q['granularity'] = p.granularity;
  if (p.branchId)    q['branchId']    = p.branchId;
  if (p.courtId)     q['courtId']     = p.courtId;
  if (p.sportId)     q['sportId']     = p.sportId;
  return q;
}

export async function fetchOccupancy(p: AnalyticsDateRange): Promise<OccupancySummary> {
  const res = await apiClient.get<OccupancySummary>(`${BASE}/occupancy`, { baseURL: REPORTING_BASE, params: toParams(p) });
  return res.data;
}

export async function fetchCourtUtilization(p: AnalyticsDateRange & { sortBy?: string; limit?: number }): Promise<CourtUtilizationSummary> {
  const params = { ...toParams(p), ...(p.sortBy ? { sortBy: p.sortBy } : {}), ...(p.limit ? { limit: p.limit } : {}) };
  const res = await apiClient.get<CourtUtilizationSummary>(`${BASE}/court-utilization`, { baseURL: REPORTING_BASE, params });
  return res.data;
}

export async function fetchPeakHours(p: AnalyticsDateRange): Promise<PeakHourSummary> {
  const res = await apiClient.get<PeakHourSummary>(`${BASE}/peak-hours`, { baseURL: REPORTING_BASE, params: toParams(p) });
  return res.data;
}

export async function fetchCancellations(p: AnalyticsDateRange): Promise<CancellationSummary> {
  const res = await apiClient.get<CancellationSummary>(`${BASE}/cancellations`, { baseURL: REPORTING_BASE, params: toParams(p) });
  return res.data;
}

export async function fetchNoShows(p: AnalyticsDateRange): Promise<NoShowSummary> {
  const res = await apiClient.get<NoShowSummary>(`${BASE}/no-shows`, { baseURL: REPORTING_BASE, params: toParams(p) });
  return res.data;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatMinor(minor: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const PRESET_RANGES = [
  { label: 'Last 7 days',  from: () => nDaysAgo(6),  to: todayString },
  { label: 'Last 30 days', from: () => nDaysAgo(29), to: todayString },
  { label: 'Last 90 days', from: () => nDaysAgo(89), to: todayString },
] as const;
