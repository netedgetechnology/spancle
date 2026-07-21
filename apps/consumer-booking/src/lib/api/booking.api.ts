/**
 * booking.api.ts
 * Consumer-facing booking API — wraps booking-service endpoints.
 * POST /api/v1/bookings, GET /api/v1/bookings, GET /api/v1/bookings/:id
 */

import { apiClient } from '@/lib/api/client';
import type { Booking, CreateBookingPayload } from '@/types/booking.types';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/bookings`;

export const bookingKeys = {
  all:       () => ['bookings-consumer'] as const,
  list:      (params: Record<string, string | number | undefined>) =>
               [...bookingKeys.all(), 'list', params] as const,
  detail:    (id: string)  => [...bookingKeys.all(), id] as const,
  reference: (ref: string) => [...bookingKeys.all(), 'ref', ref] as const,
} as const;

// ── Read ──────────────────────────────────────────────────────────────────────

export async function fetchMyBookings(params: {
  userId?:  string;
  status?:  string;
  from?:    string;
  to?:      string;
  limit?:   number;
  offset?:  number;
} = {}): Promise<Booking[]> {
  const query: Record<string, string | number> = {};
  if (params.userId)  query['userId']  = params.userId;
  if (params.status)  query['status']  = params.status;
  if (params.from)    query['from']    = params.from;
  if (params.to)      query['to']      = params.to;
  if (params.limit)   query['limit']   = params.limit;
  if (params.offset)  query['offset']  = params.offset;

  const res = await apiClient.get<Booking[]>(BASE, { baseURL: BOOKING_BASE, params: query });
  return res.data;
}

export async function fetchBooking(id: string): Promise<Booking> {
  const res = await apiClient.get<Booking>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function fetchBookingByReference(ref: string): Promise<Booking> {
  const res = await apiClient.get<Booking>(
    `${BASE}/by-reference/${encodeURIComponent(ref)}`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createBooking(payload: CreateBookingPayload): Promise<Booking> {
  const res = await apiClient.post<Booking>(BASE, payload, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function cancelBooking(id: string, reason: string): Promise<Booking> {
  const res = await apiClient.patch<Booking>(
    `${BASE}/${id}/cancel`,
    { reason },
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function rescheduleBooking(
  id:         string,
  newSlotIds: string[],
  reason?:    string,
): Promise<Booking> {
  const res = await apiClient.patch<Booking>(
    `${BASE}/${id}/reschedule`,
    { newSlotIds, ...(reason ? { reason } : {}) },
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}
