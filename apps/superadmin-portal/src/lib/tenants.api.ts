/**
 * tenants.api.ts — Tenant CRUD API calls for the superadmin portal.
 * All calls go to identity-service via /api/v1/tenants.
 */

import { apiClient } from '@/lib/api/client';
import type { TenantDetail, CreateTenantFormData, UpdateTenantFormData } from '@/types/tenant-detail.types';
import type { TenantStatus, TenantTier } from '@/types/admin.types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const tenantKeys = {
  all:    () => ['tenants'] as const,
  list:   (p: TenantListParams) => [...tenantKeys.all(), 'list', p] as const,
  detail: (id: string) => [...tenantKeys.all(), 'detail', id] as const,
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TenantListParams {
  page?:    number;
  limit?:   number;
  status?:  TenantStatus | '';
  tier?:    TenantTier | '';
  search?:  string;
}

export interface TenantListResponse {
  data:  TenantDetail[];
  total: number;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchTenantList(params: TenantListParams = {}): Promise<TenantListResponse> {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined),
  );
  const res = await apiClient.get<TenantListResponse>('/api/v1/tenants', { params: query });
  return res.data;
}

export async function fetchTenantDetail(id: string): Promise<TenantDetail> {
  const res = await apiClient.get<TenantDetail>(`/api/v1/tenants/${id}`);
  return res.data;
}

export async function createTenant(data: CreateTenantFormData): Promise<TenantDetail> {
  // Map form data to backend DTO shape
  const payload = {
    name:     data.name,
    slug:     data.slug,
    email:    data.email,
    phone:    data.phone || undefined,
    tier:     data.tier,
    settings: {
      timezone:            data.timezone,
      currency:            data.currency,
      allowPublicBookings: data.modules.booking,
    },
    // Sprint 2 extended fields stored in settings JSONB
    region:     data.region,
    modules:    data.modules,
    commission: data.commission,
    invoice:    data.invoice,
    theme:      data.theme,
    razorpay:   data.razorpay,
    payout:     data.payout,
  };
  const res = await apiClient.post<TenantDetail>('/api/v1/tenants', payload);
  return res.data;
}

export async function updateTenant(id: string, data: UpdateTenantFormData): Promise<TenantDetail> {
  const payload: Record<string, unknown> = {};
  if (data.name  !== undefined) payload['name']  = data.name;
  if (data.email !== undefined) payload['email'] = data.email;
  if (data.phone !== undefined) payload['phone'] = data.phone;
  if (data.theme?.logoUrl !== undefined) payload['logoUrl'] = data.theme.logoUrl;

  // Settings update (goes to PATCH /tenants/:id/settings)
  if (data.timezone || data.currency || data.modules) {
    await apiClient.patch(`/api/v1/tenants/${id}/settings`, {
      settings: {
        timezone: data.timezone,
        currency: data.currency,
        allowPublicBookings: data.modules?.booking,
      },
    });
  }

  // Core fields update
  if (Object.keys(payload).length > 0) {
    await apiClient.patch(`/api/v1/tenants/${id}`, payload);
  }

  return fetchTenantDetail(id);
}

export async function changeTenantTier(id: string, tier: TenantTier): Promise<TenantDetail> {
  const res = await apiClient.patch<TenantDetail>(`/api/v1/tenants/${id}/tier`, { tier });
  return res.data;
}

export async function activateTenant(id: string): Promise<TenantDetail> {
  const res = await apiClient.post<TenantDetail>(`/api/v1/tenants/${id}/activate`, {});
  return res.data;
}

export async function suspendTenant(id: string, reason: string): Promise<TenantDetail> {
  const res = await apiClient.post<TenantDetail>(`/api/v1/tenants/${id}/suspend`, { reason });
  return res.data;
}

export async function terminateTenant(id: string, reason: string): Promise<TenantDetail> {
  const res = await apiClient.post<TenantDetail>(`/api/v1/tenants/${id}/terminate`, { reason });
  return res.data;
}
