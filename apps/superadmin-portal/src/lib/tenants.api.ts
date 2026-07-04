/**
 * tenants.api.ts — Tenant CRUD API calls for the superadmin portal.
 * All calls go to identity-service via /api/v1/tenants.
 */

import { apiClient } from '@/lib/api/client';
import type { TenantDetail, CreateTenantFormData, UpdateTenantFormData } from '@/types/tenant-detail.types';
import type { TenantStatus, TenantTier } from '@/types/admin.types';

export const tenantKeys = {
  all:          () => ['tenants'] as const,
  list:         (p: TenantListParams) => [...tenantKeys.all(), 'list', p] as const,
  detail:       (id: string) => [...tenantKeys.all(), 'detail', id] as const,
  slugAvailable: (slug: string) => [...tenantKeys.all(), 'slug', slug] as const,
};

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

/** Structured API error from backend */
export interface ApiFieldErrors {
  errors?: Record<string, string>;
  message?: string | string[];
  statusCode?: number;
  error?: string;
}

/** Parse class-validator batch errors from NestJS into field map */
export function parseBackendErrors(err: unknown): Record<string, string> {
  const data = (err as any)?.response?.data ?? (err as any);
  const messages: string[] = Array.isArray(data?.message)
    ? data.message
    : typeof data?.message === 'string'
    ? [data.message]
    : [];

  const fieldErrors: Record<string, string> = {};

  for (const msg of messages) {
    const lower = msg.toLowerCase();
    if (lower.includes('name'))     fieldErrors['name']  = msg;
    else if (lower.includes('slug'))  fieldErrors['slug']  = msg;
    else if (lower.includes('email')) fieldErrors['email'] = msg;
    else if (lower.includes('phone')) fieldErrors['phone'] = msg;
    else if (lower.includes('tier'))  fieldErrors['tier']  = msg;
    else fieldErrors['_general'] = msg;
  }

  // Handle ConflictException (409) — slug or email taken
  if (data?.statusCode === 409) {
    const msg: string = typeof data.message === 'string' ? data.message : '';
    if (msg.includes('slug')) fieldErrors['slug'] = 'This subdomain is already taken.';
    else if (msg.includes('email')) fieldErrors['email'] = 'This email is already registered.';
    else fieldErrors['_general'] = msg;
  }

  if (Object.keys(fieldErrors).length === 0 && messages.length > 0) {
    fieldErrors['_general'] = messages.join(' ');
  }

  return fieldErrors;
}

export async function checkSlugAvailable(slug: string): Promise<{ available: boolean }> {
  const res = await apiClient.get<{ available: boolean }>('/api/v1/tenants/slug-available', {
    params: { slug },
  });
  return res.data;
}

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
  const payload = {
    name:  data.name,
    slug:  data.slug,
    email: data.email,
    phone: data.phone || undefined,
    tier:  data.tier,
    settings: {
      ownerName:           data.ownerName,
      timezone:            data.timezone,
      currency:            data.currency,
      allowPublicBookings: data.modules.booking,
    },
  };
  const res = await apiClient.post<TenantDetail>('/api/v1/tenants', payload);
  return res.data;
}

export async function updateTenant(id: string, data: UpdateTenantFormData): Promise<TenantDetail> {
  const corePayload: Record<string, unknown> = {};
  if (data.name  !== undefined) corePayload['name']  = data.name;
  if (data.email !== undefined) corePayload['email'] = data.email;
  if (data.phone !== undefined) corePayload['phone'] = data.phone;
  if (data.theme?.logoUrl !== undefined) corePayload['logoUrl'] = data.theme.logoUrl;

  const settingsPayload: Record<string, unknown> = {};
  if (data.ownerName !== undefined) settingsPayload['ownerName']  = data.ownerName;
  if (data.timezone  !== undefined) settingsPayload['timezone']   = data.timezone;
  if (data.currency  !== undefined) settingsPayload['currency']   = data.currency;
  if (data.modules   !== undefined) settingsPayload['allowPublicBookings'] = data.modules.booking;

  if (Object.keys(settingsPayload).length > 0) {
    await apiClient.patch(`/api/v1/tenants/${id}/settings`, { settings: settingsPayload });
  }
  if (Object.keys(corePayload).length > 0) {
    await apiClient.patch(`/api/v1/tenants/${id}`, corePayload);
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
