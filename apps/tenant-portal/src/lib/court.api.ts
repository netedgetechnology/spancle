/**
 * court.api.ts — typed API functions for court management.
 * All calls through apiClient (session-aware, x-tenant-id injected).
 */
import { apiClient } from '@/lib/api/client';
import type {
  Court,
  CourtStatus,
  CourtFormValues,
  GenerateCourtsResult,
} from '@/types/court.types';
import { formValuesToPayload } from '@/types/court.types';

const BASE = '/api/v1/courts';

// ── Query key factory ─────────────────────────────────────────────────────────

export const courtKeys = {
  all:       ()                           => ['courts']                                    as const,
  list:      (f?: { branchId?: string; sportId?: string; status?: string }) =>
               [...courtKeys.all(), 'list', f ?? {}]                                      as const,
  detail:    (id: string)                 => [...courtKeys.all(), id]                     as const,
  summary:   ()                           => [...courtKeys.all(), 'status-summary']       as const,
  byBranch:  (branchId: string, status?: string) =>
               [...courtKeys.all(), 'branch', branchId, { status }]                      as const,
  bySport:   (sportId: string, branchId?: string) =>
               [...courtKeys.all(), 'sport', sportId, { branchId }]                      as const,
} as const;

// ── Read ──────────────────────────────────────────────────────────────────────

export async function fetchCourts(params?: {
  branchId?: string;
  sportId?:  string;
  status?:   CourtStatus;
}): Promise<Court[]> {
  const res = await apiClient.get<Court[]>(BASE, { params });
  return res.data;
}

export async function fetchCourt(id: string): Promise<Court> {
  const res = await apiClient.get<Court>(`${BASE}/${id}`);
  return res.data;
}

export async function fetchCourtsByBranch(
  branchId: string,
  status?:  CourtStatus,
): Promise<Court[]> {
  const res = await apiClient.get<Court[]>(`${BASE}/by-branch/${branchId}`, {
    params: status ? { status } : undefined,
  });
  return res.data;
}

export async function fetchCourtsBySport(
  sportId:   string,
  branchId?: string,
): Promise<Court[]> {
  const res = await apiClient.get<Court[]>(`${BASE}/by-sport/${sportId}`, {
    params: branchId ? { branchId } : undefined,
  });
  return res.data;
}

export async function fetchCourtStatusSummary(): Promise<Record<CourtStatus, number>> {
  const res = await apiClient.get<Record<CourtStatus, number>>(`${BASE}/status-summary`);
  return res.data;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createCourt(form: Partial<CourtFormValues>): Promise<Court> {
  const res = await apiClient.post<Court>(BASE, formValuesToPayload(form));
  return res.data;
}

export async function generateCourts(payload: Record<string, unknown>): Promise<GenerateCourtsResult> {
  const res = await apiClient.post<GenerateCourtsResult>(`${BASE}/generate`, payload);
  return res.data;
}

export async function updateCourt(id: string, form: Partial<CourtFormValues>): Promise<Court> {
  const res = await apiClient.patch<Court>(`${BASE}/${id}`, formValuesToPayload(form));
  return res.data;
}

export async function updateCourtStatus(id: string, status: CourtStatus): Promise<Court> {
  const res = await apiClient.patch<Court>(`${BASE}/${id}/status`, { status });
  return res.data;
}

export async function setCourtMaintenance(
  id:                     string,
  maintenanceNote:        string,
  maintenanceExpectedEnd?: string,
): Promise<Court> {
  const res = await apiClient.patch<Court>(`${BASE}/${id}/maintenance`, {
    maintenanceNote,
    ...(maintenanceExpectedEnd && { maintenanceExpectedEnd }),
  });
  return res.data;
}

export async function deleteCourt(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
