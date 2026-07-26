/**
 * sport.api.ts
 * Calls booking-service: GET /api/v1/sports
 */

import { apiClient } from '@/lib/api/client';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/sports`;

export interface Sport {
  id:        string;
  tenantId:  string;
  name:      string;
  slug:      string;
  icon:      string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const sportKeys = {
  all:  () => ['sports-consumer'] as const,
  list: () => [...sportKeys.all(), 'list'] as const,
} as const;

export async function fetchSports(): Promise<Sport[]> {
  const res = await apiClient.get<Sport[]>(BASE, { baseURL: BOOKING_BASE });
  return res.data;
}
