/**
 * slot.api.ts — typed API functions for the slot calendar module.
 *
 * Calls go to booking-service (NEXT_PUBLIC_BOOKING_URL).
 * All routes are tenant-scoped — apiClient injects x-tenant-id.
 */
import { apiClient } from '@/lib/api/client';
import type { Slot, SlotStatus, CalendarFilters } from '@/types/slot.types';

// booking-service runs on a separate port from identity-service
const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']        ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL']    ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/slots`;

// ── Query key factory ─────────────────────────────────────────────────────────

export const slotKeys = {
  all:        ()                     => ['slots']                              as const,
  calendar:   (filters: CalendarFilters) =>
                [...slotKeys.all(), 'calendar', filters]                       as const,
  list:       (params: Record<string, unknown>) =>
                [...slotKeys.all(), 'list', params]                            as const,
  detail:     (id: string)           => [...slotKeys.all(), id]               as const,
  summary:    ()                     => [...slotKeys.all(), 'status-summary'] as const,
  availability: (courtId: string, from: string, to: string) =>
                [...slotKeys.all(), 'availability', courtId, from, to]        as const,
} as const;

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Primary calendar query — fetches all slots for a date range.
 * Passes filters as query params; backend returns slots ordered by startAt.
 */
export async function fetchCalendarSlots(
  filters: CalendarFilters,
): Promise<Slot[]> {
  const params: Record<string, string> = {
    from: `${filters.date}T00:00:00.000Z`,
    to:   `${filters.date}T23:59:59.999Z`,
  };

  if (filters.courtId)  params['courtId']  = filters.courtId;
  if (filters.branchId) params['branchId'] = filters.branchId;
  if (filters.sportId)  params['sportId']  = filters.sportId;
  if (filters.status)   params['status']   = filters.status;

  const res = await apiClient.get<Slot[]>(BASE, { baseURL: BOOKING_BASE, params });
  return res.data;
}

export async function fetchSlot(id: string): Promise<Slot> {
  const res = await apiClient.get<Slot>(`${BASE}/${id}`, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function fetchSlotStatusSummary(): Promise<Record<SlotStatus, number>> {
  const res = await apiClient.get<Record<SlotStatus, number>>(
    `${BASE}/status-summary`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function fetchAvailableSlots(params: {
  courtId:  string;
  branchId: string;
  from:     string;
  to:       string;
}): Promise<Slot[]> {
  const res = await apiClient.get<Slot[]>(`${BASE}/availability`, {
    baseURL: BOOKING_BASE,
    params,
  });
  return res.data;
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export async function reserveSlot(id: string): Promise<Slot> {
  const res = await apiClient.patch<Slot>(
    `${BASE}/${id}/reserve`,
    {},
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function updateSlotStatus(id: string, status: SlotStatus): Promise<Slot> {
  const res = await apiClient.patch<Slot>(
    `${BASE}/${id}/status`,
    { status },
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function updateSlotPriceOverride(
  id:                  string,
  priceOverrideMinor:  number | null,
): Promise<Slot> {
  const res = await apiClient.patch<Slot>(
    `${BASE}/${id}`,
    { priceOverrideMinor },
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export async function releaseSlot(id: string): Promise<Slot> {
  return updateSlotStatus(id, 'available');
}

export async function cancelSlot(id: string): Promise<Slot> {
  return updateSlotStatus(id, 'cancelled');
}
