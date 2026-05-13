/**
 * sport.api.ts — typed API functions for the sport management module.
 * All calls routed through apiClient (session-aware, injects x-tenant-id).
 *
 * Endpoint summary (all under /api/v1/sports):
 *   POST   /                      create
 *   GET    /                      list (optional ?status=)
 *   GET    /status-summary        { active: N, inactive: N }
 *   GET    /by-slug/:slug         single by slug
 *   GET    /by-branch/:branchId   active sports at a branch
 *   GET    /:id                   single by id
 *   PATCH  /:id                   update
 *   PATCH  /:id/status            status transition
 *   PATCH  /:id/branches          replace branch mappings
 *   DELETE /:id                   soft delete (inactive only)
 */
import { apiClient } from '@/lib/api/client';
import type { Sport, SportStatus, SportFormValues } from '@/types/sport.types';
import { formValuesToPayload } from '@/types/sport.types';

const BASE = '/api/v1/sports';

// ── Query key factory ─────────────────────────────────────────────────────────

export const sportKeys = {
  all:       ()                  => ['sports']                             as const,
  list:      (status?: string)   => [...sportKeys.all(), 'list', { status }] as const,
  detail:    (id: string)        => [...sportKeys.all(), id]               as const,
  summary:   ()                  => [...sportKeys.all(), 'status-summary'] as const,
  byBranch:  (branchId: string)  => [...sportKeys.all(), 'branch', branchId] as const,
} as const;

// ── Read ──────────────────────────────────────────────────────────────────────

export async function fetchSports(status?: SportStatus): Promise<Sport[]> {
  const res = await apiClient.get<Sport[]>(BASE, {
    params: status ? { status } : undefined,
  });
  return res.data;
}

export async function fetchSport(id: string): Promise<Sport> {
  const res = await apiClient.get<Sport>(`${BASE}/${id}`);
  return res.data;
}

export async function fetchSportBySlug(slug: string): Promise<Sport> {
  const res = await apiClient.get<Sport>(`${BASE}/by-slug/${encodeURIComponent(slug)}`);
  return res.data;
}

export async function fetchSportsByBranch(branchId: string): Promise<Sport[]> {
  const res = await apiClient.get<Sport[]>(`${BASE}/by-branch/${branchId}`);
  return res.data;
}

export async function fetchSportStatusSummary(): Promise<Record<SportStatus, number>> {
  const res = await apiClient.get<Record<SportStatus, number>>(`${BASE}/status-summary`);
  return res.data;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createSport(form: Partial<SportFormValues>): Promise<Sport> {
  const res = await apiClient.post<Sport>(BASE, formValuesToPayload(form));
  return res.data;
}

export async function updateSport(id: string, form: Partial<SportFormValues>): Promise<Sport> {
  const res = await apiClient.patch<Sport>(`${BASE}/${id}`, formValuesToPayload(form));
  return res.data;
}

export async function updateSportStatus(id: string, status: SportStatus): Promise<Sport> {
  const res = await apiClient.patch<Sport>(`${BASE}/${id}/status`, { status });
  return res.data;
}

export async function assignSportBranches(id: string, branchIds: string[]): Promise<Sport> {
  const res = await apiClient.patch<Sport>(`${BASE}/${id}/branches`, { branchIds });
  return res.data;
}

export async function deleteSport(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
