/**
 * rate-card.api.ts — Rate Card management for the tenant portal.
 * Calls booking-service via BOOKING_BASE/api/v1/rate-cards (same pattern as slot.api.ts).
 */
import { apiClient } from '@/lib/api/client';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/rate-cards`;

export interface HourlySlot {
  hour:       number;   // 0-23
  priceMinor: number;
}

export interface DayPriceGrid {
  hourlySlots: HourlySlot[];
}

export interface DateOverride {
  date:         string;
  label?:       string;
  allDay:       boolean;
  priceMinor?:  number;
  hourlySlots?: HourlySlot[];
}

export type WeeklyGrid = Partial<Record<
  'monday'|'tuesday'|'wednesday'|'thursday'|'friday'|'saturday'|'sunday',
  DayPriceGrid
>>;

export interface RateCard {
  id:                string;
  tenantId:          string;
  name:              string;
  description:       string | null;
  currency:          string;
  defaultPriceMinor: number | null;
  weeklyGrid:        WeeklyGrid;
  dateOverrides:     DateOverride[];
  isActive:          boolean;
  createdAt:         string;
  updatedAt:         string;
}

export interface RateCardListResponse {
  data:  RateCard[];
  total: number;
}

export const rateCardKeys = {
  all:    () => ['rate-cards'] as const,
  list:   (p?: Record<string, unknown>) => [...rateCardKeys.all(), 'list', p ?? {}] as const,
  detail: (id: string) => [...rateCardKeys.all(), id] as const,
};

export async function fetchRateCards(opts?: { isActive?: boolean }): Promise<RateCardListResponse> {
  const params: Record<string, string> = {};
  if (opts?.isActive !== undefined) params['isActive'] = String(opts.isActive);
  const res = await apiClient.get<RateCardListResponse>(BASE, { baseURL: BOOKING_BASE, params });
  return res.data;
}

export async function fetchRateCard(id: string): Promise<RateCard> {
  const res = await apiClient.get<RateCard>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}

export type CreateRateCardPayload = Omit<RateCard, 'id'|'tenantId'|'createdAt'|'updatedAt'>;

export async function createRateCard(dto: Partial<CreateRateCardPayload>): Promise<RateCard> {
  const res = await apiClient.post<RateCard>(BASE, dto, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function updateRateCard(id: string, dto: Partial<CreateRateCardPayload>): Promise<RateCard> {
  const res = await apiClient.patch<RateCard>(`${BASE}/${id}`, dto, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function activateRateCard(id: string): Promise<RateCard> {
  const res = await apiClient.patch<RateCard>(`${BASE}/${id}/activate`, {}, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function deactivateRateCard(id: string): Promise<RateCard> {
  const res = await apiClient.patch<RateCard>(`${BASE}/${id}/deactivate`, {}, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function deleteRateCard(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
}
