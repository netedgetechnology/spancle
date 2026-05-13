/**
 * branch.api.ts — typed API functions for the branch management module.
 * All calls routed through apiClient (session-aware, injects tenant headers).
 */
import { apiClient } from '@/lib/api/client';
import type {
  Branch,
  BranchStatus,
  BranchFormValues,
} from '@/types/branch.types';

const BASE = '/api/v1/branches';

// ── Query key factory ─────────────────────────────────────────────────────────

export const branchKeys = {
  all:     () => ['branches'] as const,
  list:    (status?: string) => [...branchKeys.all(), 'list', { status }] as const,
  detail:  (id: string)      => [...branchKeys.all(), id]                 as const,
  summary: ()                => [...branchKeys.all(), 'status-summary']   as const,
} as const;

// ── API functions ─────────────────────────────────────────────────────────────

export async function fetchBranches(status?: BranchStatus): Promise<Branch[]> {
  const res = await apiClient.get<Branch[]>(BASE, {
    params: status ? { status } : undefined,
  });
  return res.data;
}

export async function fetchBranch(id: string): Promise<Branch> {
  const res = await apiClient.get<Branch>(`${BASE}/${id}`);
  return res.data;
}

export async function fetchBranchBySlug(slug: string): Promise<Branch> {
  const res = await apiClient.get<Branch>(`${BASE}/by-slug/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function fetchStatusSummary(): Promise<Record<BranchStatus, number>> {
  const res = await apiClient.get<Record<BranchStatus, number>>(`${BASE}/status-summary`);
  return res.data;
}

export async function createBranch(input: Partial<BranchFormValues>): Promise<Branch> {
  const payload = formValuesToPayload(input);
  const res     = await apiClient.post<Branch>(BASE, payload);
  return res.data;
}

export async function updateBranch(id: string, input: Partial<BranchFormValues>): Promise<Branch> {
  const payload = formValuesToPayload(input);
  const res     = await apiClient.patch<Branch>(`${BASE}/${id}`, payload);
  return res.data;
}

export async function updateBranchStatus(id: string, status: BranchStatus): Promise<Branch> {
  const res = await apiClient.patch<Branch>(`${BASE}/${id}/status`, { status });
  return res.data;
}

export async function assignBranchManager(
  id:            string,
  managerUserId: string | null,
): Promise<Branch> {
  const res = await apiClient.patch<Branch>(`${BASE}/${id}/manager`, { managerUserId });
  return res.data;
}

export async function deleteBranch(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts BranchFormValues (string-based for inputs) to the API payload shape.
 * Trims strings, converts empty strings to undefined/null, parses numbers.
 */
function formValuesToPayload(form: Partial<BranchFormValues>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const opt = (v: string | undefined) => v?.trim() || null;

  if (form.name         !== undefined) payload['name']         = form.name.trim();
  if (form.slug         !== undefined) payload['slug']         = form.slug.trim().toLowerCase();
  if (form.description  !== undefined) payload['description']  = opt(form.description);
  if (form.addressLine1 !== undefined) payload['addressLine1'] = form.addressLine1.trim();
  if (form.addressLine2 !== undefined) payload['addressLine2'] = opt(form.addressLine2);
  if (form.city         !== undefined) payload['city']         = form.city.trim();
  if (form.county       !== undefined) payload['county']       = opt(form.county);
  if (form.postcode     !== undefined) payload['postcode']     = form.postcode.trim().toUpperCase();
  if (form.countryCode  !== undefined) payload['countryCode']  = form.countryCode.trim().toUpperCase();
  if (form.phone        !== undefined) payload['phone']        = opt(form.phone);
  if (form.email        !== undefined) payload['email']        = opt(form.email);
  if (form.website      !== undefined) payload['website']      = opt(form.website);
  if (form.mapUrl       !== undefined) payload['mapUrl']       = opt(form.mapUrl);
  if (form.imageUrl     !== undefined) payload['imageUrl']     = opt(form.imageUrl);
  if (form.geoLabel     !== undefined) payload['geoLabel']     = opt(form.geoLabel);
  if (form.status       !== undefined) payload['status']       = form.status;
  if (form.timings      !== undefined) payload['timings']      = form.timings;
  if (form.sortOrder    !== undefined) payload['sortOrder']    = form.sortOrder;

  if (form.managerUserId !== undefined) {
    payload['managerUserId'] = form.managerUserId?.trim() || null;
  }

  // Latitude / longitude: parse or omit
  if (form.latitude !== undefined) {
    const n = parseFloat(form.latitude);
    payload['latitude'] = isNaN(n) ? null : n;
  }
  if (form.longitude !== undefined) {
    const n = parseFloat(form.longitude);
    payload['longitude'] = isNaN(n) ? null : n;
  }

  // Facilities: comma-separated string → string array
  if (form.facilities !== undefined) {
    payload['facilities'] = form.facilities
      ? form.facilities.split(',').map((s) => s.trim()).filter(Boolean)
      : null;
  }

  return payload;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}
