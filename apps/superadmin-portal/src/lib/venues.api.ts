/**
 * venues.api.ts — Cross-tenant venue/court/sport read-only views for superadmin.
 * All calls go to identity-service (/api/v1/branches, /api/v1/courts, /api/v1/sports).
 * SUPER_ADMIN passes the target tenant's ID as x-tenant-id to read their data.
 * apiClient injects NEXT_PUBLIC_API_URL (api.spancle.com) automatically.
 */
import { apiClient } from '@/lib/api/client';

export interface VenueSummary {
  id:        string;
  tenantId:  string;
  name:      string;
  slug:      string;
  status:    string;
  city:      string | null;
  country:   string | null;
  createdAt: string;
}

export interface CourtSummary {
  id:         string;
  tenantId:   string;
  branchId:   string;
  name:       string;
  status:     string;
  courtType:  string;
  surfaceType: string;
  sportId:    string | null;
}

export interface SportSummary {
  id:       string;
  tenantId: string;
  name:     string;
  slug:     string;
  status:   string;
  icon:     string | null;
  color:    string | null;
}

/** Fetches branches for a specific tenant — uses that tenant's ID as x-tenant-id */
export async function fetchVenuesForTenant(tenantId: string): Promise<VenueSummary[]> {
  const res = await apiClient.get<VenueSummary[]>('/api/v1/branches', {
    headers: { 'x-tenant-id': tenantId },
  });
  return res.data;
}

export async function fetchCourtsForTenant(tenantId: string, branchId?: string): Promise<CourtSummary[]> {
  const params = branchId ? { branchId } : undefined;
  const res = await apiClient.get<CourtSummary[]>('/api/v1/courts', {
    headers: { 'x-tenant-id': tenantId },
    params,
  });
  return res.data;
}

export async function fetchSportsForTenant(tenantId: string): Promise<SportSummary[]> {
  const res = await apiClient.get<SportSummary[]>('/api/v1/sports', {
    headers: { 'x-tenant-id': tenantId },
  });
  return res.data;
}
