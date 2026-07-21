/**
 * slot.api.ts
 * Calls booking-service: GET /api/v1/slots and GET /api/v1/slots/availability
 */

import { apiClient } from '@/lib/api/client';
import type { Slot } from '@/types/booking.types';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/slots`;

export const slotKeys = {
  all:          () => ['slots-consumer'] as const,
  availability: (courtId: string, branchId: string, date: string) =>
                  [...slotKeys.all(), 'availability', courtId, branchId, date] as const,
  list:         (params: Record<string, string>) =>
                  [...slotKeys.all(), 'list', params] as const,
  detail:       (id: string) => [...slotKeys.all(), id] as const,
} as const;

/**
 * fetchAvailableSlots — public-facing slot availability for a court on a date.
 * Uses GET /api/v1/slots/availability which filters to status='available'.
 */
export async function fetchAvailableSlots(params: {
  courtId:  string;
  branchId: string;
  date:     string;  // YYYY-MM-DD
}): Promise<Slot[]> {
  const from = `${params.date}T00:00:00.000Z`;
  const to   = `${params.date}T23:59:59.999Z`;

  const res = await apiClient.get<Slot[]>(`${BASE}/availability`, {
    baseURL: BOOKING_BASE,
    params:  { courtId: params.courtId, branchId: params.branchId, from, to },
  });
  return res.data;
}

/**
 * fetchDaySlots — all slots for a court+date regardless of status.
 * Used to show the full day grid (available, reserved, booked, unavailable).
 */
export async function fetchDaySlots(params: {
  courtId:  string;
  branchId: string;
  date:     string;
}): Promise<Slot[]> {
  const from = `${params.date}T00:00:00.000Z`;
  const to   = `${params.date}T23:59:59.999Z`;

  const res = await apiClient.get<Slot[]>(BASE, {
    baseURL: BOOKING_BASE,
    params:  { courtId: params.courtId, branchId: params.branchId, from, to },
  });
  return res.data;
}

export async function fetchSlot(id: string): Promise<Slot> {
  const res = await apiClient.get<Slot>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}
