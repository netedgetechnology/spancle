import { apiClient } from '@/lib/api/client';
import type { Booking, BookingStatus, BookingQueryParams, BookingFormValues } from '@/types/booking.types';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/bookings`;

// ── Query key factory ─────────────────────────────────────────────────────────

export const bookingKeys = {
  all:       ()                              => ['bookings']                                   as const,
  list:      (params: BookingQueryParams)    => [...bookingKeys.all(), 'list', params]         as const,
  detail:    (id: string)                    => [...bookingKeys.all(), id]                     as const,
  reference: (ref: string)                   => [...bookingKeys.all(), 'ref', ref]             as const,
  summary:   ()                              => [...bookingKeys.all(), 'status-summary']      as const,
} as const;

// ── Read ──────────────────────────────────────────────────────────────────────

export async function fetchBookings(params: BookingQueryParams = {}): Promise<Booking[]> {
  const query: Record<string, string | number> = {};
  if (params.branchId)  query['branchId']  = params.branchId;
  if (params.courtId)   query['courtId']   = params.courtId;
  if (params.sportId)   query['sportId']   = params.sportId;
  if (params.userId)    query['userId']    = params.userId;
  if (params.status)    query['status']    = params.status;
  if (params.reference) query['reference'] = params.reference;
  if (params.from)      query['from']      = params.from;
  if (params.to)        query['to']        = params.to;
  if (params.limit)     query['limit']     = params.limit;
  if (params.offset)    query['offset']    = params.offset;

  const res = await apiClient.get<Booking[]>(BASE, { baseURL: BOOKING_BASE, params: query });
  return res.data;
}

export async function fetchBooking(id: string): Promise<Booking> {
  const res = await apiClient.get<Booking>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function fetchBookingByReference(reference: string): Promise<Booking> {
  const res = await apiClient.get<Booking>(
    `${BASE}/by-reference/${encodeURIComponent(reference)}`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function fetchBookingStatusSummary(): Promise<Record<BookingStatus, number>> {
  const res = await apiClient.get<Record<BookingStatus, number>>(
    `${BASE}/status-summary`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

// ── Write ─────────────────────────────────────────────────────────────────────

export async function createBooking(form: BookingFormValues): Promise<Booking> {
  const payload: Record<string, unknown> = {
    slotIds:   form.slotIds,
    branchId:  form.branchId,
    courtId:   form.courtId,
    customer: {
      name:     form.customerName.trim(),
      email:    form.customerEmail.trim().toLowerCase(),
      phone:    form.customerPhone.trim() || undefined,
      userId:   form.userId.trim()        || undefined,
      isMember: form.isMember,
    },
    channel:          form.channel,
    participantCount: form.participantCount,
    customerNotes:    form.customerNotes.trim() || undefined,
    internalNotes:    form.internalNotes.trim() || undefined,
  };

  if (form.sportId.trim()) payload['sportId'] = form.sportId.trim();

  if (form.enableRecurrence) {
    payload['recurrence'] = {
      frequency:   form.recurrenceFrequency,
      occurrences: form.recurrenceOccurrences,
    };
  }

  const res = await apiClient.post<Booking>(BASE, payload, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function confirmBooking(id: string): Promise<Booking> {
  const res = await apiClient.patch<Booking>(
    `${BASE}/${id}/confirm`, {}, { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function cancelBooking(id: string, reason: string): Promise<Booking> {
  const res = await apiClient.patch<Booking>(
    `${BASE}/${id}/cancel`, { reason }, { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function checkInBooking(id: string): Promise<Booking> {
  const res = await apiClient.patch<Booking>(
    `${BASE}/${id}/check-in`, {}, { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function markNoShow(id: string, notes?: string): Promise<Booking> {
  const res = await apiClient.patch<Booking>(
    `${BASE}/${id}/no-show`, { notes }, { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function rescheduleBooking(id: string, newSlotIds: string[], reason?: string): Promise<Booking> {
  const res = await apiClient.patch<Booking>(
    `${BASE}/${id}/reschedule`, { newSlotIds, reason }, { baseURL: BOOKING_BASE },
  );
  return res.data;
}
