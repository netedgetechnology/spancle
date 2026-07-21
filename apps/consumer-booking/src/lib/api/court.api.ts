/**
 * court.api.ts
 * Calls booking-service: GET /api/v1/courts (courts_booking table)
 */

import { apiClient } from '@/lib/api/client';
import type { Court } from '@/types/booking.types';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/courts`;

export const courtKeys = {
  all:      () => ['courts-booking'] as const,
  list:     (params: { venueId?: string; status?: string }) =>
              [...courtKeys.all(), 'list', params] as const,
  detail:   (id: string) => [...courtKeys.all(), id] as const,
} as const;

export async function fetchCourts(params?: {
  venueId?:  string;
  branchId?: string;
  status?:   string;
}): Promise<Court[]> {
  const query: Record<string, string> = {};
  if (params?.venueId)  query['venueId']  = params.venueId;
  if (params?.branchId) query['branchId'] = params.branchId;
  if (params?.status)   query['status']   = params.status;

  const res = await apiClient.get<Court[]>(BASE, {
    baseURL: BOOKING_BASE,
    params:  query,
  });
  return res.data;
}

export async function fetchCourt(id: string): Promise<Court> {
  const res = await apiClient.get<Court>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}
