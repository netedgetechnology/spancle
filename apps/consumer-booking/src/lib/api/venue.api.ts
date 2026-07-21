/**
 * venue.api.ts
 * Calls booking-service: GET /api/v1/venues
 */

import { apiClient } from '@/lib/api/client';
import type { Venue } from '@/types/booking.types';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/venues`;

export const venueKeys = {
  all:    () => ['venues'] as const,
  list:   () => [...venueKeys.all(), 'list'] as const,
  detail: (id: string) => [...venueKeys.all(), id] as const,
} as const;

export async function fetchVenues(): Promise<Venue[]> {
  const res = await apiClient.get<Venue[]>(BASE, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function fetchVenue(id: string): Promise<Venue> {
  const res = await apiClient.get<Venue>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}
