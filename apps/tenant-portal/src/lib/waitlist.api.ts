import { apiClient } from '@/lib/api/client';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/waitlist`;

export interface WaitlistEntry {
  id:            string;
  tenantId:      string;
  slotId:        string;
  courtId:       string;
  branchId:      string;
  customerId:    string | null;
  customerName:  string;
  customerEmail: string | null;
  customerPhone: string | null;
  position:      number;
  status:        'waiting' | 'promoted' | 'expired' | 'booked' | 'cancelled';
  promotedAt:    string | null;
  promotedUntil: string | null;
  bookingId:     string | null;
  createdAt:     string;
}

export const waitlistKeys = {
  all:   ()             => ['waitlist']               as const,
  slot:  (slotId: string) => ['waitlist', 'slot', slotId] as const,
};

export interface JoinWaitlistPayload {
  slotId:        string;
  courtId:       string;
  branchId:      string;
  customerId?:   string;
  customerName:  string;
  customerEmail?: string;
  customerPhone?: string;
}

export async function joinWaitlist(payload: JoinWaitlistPayload): Promise<WaitlistEntry> {
  const res = await apiClient.post<WaitlistEntry>(BASE, payload, { baseURL: BOOKING_BASE });
  return res.data;
}

export async function leaveWaitlist(entryId: string): Promise<void> {
  await apiClient.delete(`${BASE}/${entryId}`, { baseURL: BOOKING_BASE });
}

export async function fetchSlotWaitlist(slotId: string): Promise<WaitlistEntry[]> {
  const res = await apiClient.get<WaitlistEntry[]>(
    `${BASE}/slot/${slotId}`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}
