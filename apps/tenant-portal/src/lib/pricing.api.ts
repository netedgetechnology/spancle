/**
 * pricing.api.ts — Pricing rule management for the tenant portal.
 * Calls booking-service (NEXT_PUBLIC_BOOKING_URL).
 */
import { apiClient } from '@/lib/api/client';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/pricing-rules`;

export type PricingRuleType    = 'base' | 'peak' | 'weekend' | 'holiday' | 'member' | 'custom';
export type PricingModifierType = 'percentage' | 'fixed' | 'absolute';
export type PricingScope       = 'tenant' | 'branch' | 'sport' | 'court';

export interface PricingRule {
  id:            string;
  tenantId:      string;
  name:          string;
  description:   string | null;
  ruleType:      PricingRuleType;
  modifierType:  PricingModifierType;
  modifierValue: number;
  scope:         PricingScope;
  branchId:      string | null;
  sportId:       string | null;
  courtId:       string | null;
  validFrom:     string | null;
  validUntil:    string | null;
  daysOfWeek:    string[] | null;
  timeStart:     string | null;
  timeEnd:       string | null;
  priority:      number;
  isActive:      boolean;
  isDeleted:     boolean;
  createdAt:     string;
  updatedAt:     string;
}

export type CreatePricingRulePayload = Omit<PricingRule,
  'id' | 'tenantId' | 'isDeleted' | 'createdAt' | 'updatedAt'>;

export const pricingKeys = {
  all:    ()                        => ['pricing-rules'] as const,
  list:   (params?: Record<string, unknown>) => [...pricingKeys.all(), 'list', params ?? {}] as const,
  detail: (id: string)              => [...pricingKeys.all(), id] as const,
};

export async function fetchPricingRules(params?: {
  scope?: PricingScope;
  ruleType?: PricingRuleType;
  isActive?: boolean;
}): Promise<PricingRule[]> {
  const res = await apiClient.get<PricingRule[]>(BASE, { baseURL: BOOKING_BASE, params });
  return res.data;
}

export async function fetchPricingRule(id: string): Promise<PricingRule> {
  const res = await apiClient.get<PricingRule>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function createPricingRule(dto: Partial<CreatePricingRulePayload>): Promise<PricingRule> {
  const res = await apiClient.post<PricingRule>(BASE, dto, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function updatePricingRule(
  id:  string,
  dto: Partial<CreatePricingRulePayload>,
): Promise<PricingRule> {
  const res = await apiClient.patch<PricingRule>(`${BASE}/${id}`, dto, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function activatePricingRule(id: string): Promise<PricingRule> {
  const res = await apiClient.patch<PricingRule>(`${BASE}/${id}/activate`, {}, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function deactivatePricingRule(id: string): Promise<PricingRule> {
  const res = await apiClient.patch<PricingRule>(`${BASE}/${id}/deactivate`, {}, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function deletePricingRule(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
}
