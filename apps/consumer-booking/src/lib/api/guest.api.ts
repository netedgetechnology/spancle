/**
 * guest.api.ts
 *
 * Typed client for guest booking endpoints.
 * All routes call booking-service via BOOKING_BASE.
 * No auth token required for guest endpoints (they are @Public).
 * x-tenant-id is still required — injected by apiClient interceptor from session,
 * or manually via guestClient for unauthenticated requests.
 */

import axios from 'axios';
import type { Booking, IssuedQrToken } from '@/types/booking.types';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const TENANT_ID = process.env['NEXT_PUBLIC_TENANT_ID'] ?? '';

/**
 * unauthenticated axios instance for guest endpoints.
 * Injects x-tenant-id from env (no session required).
 */
const guestClient = axios.create({
  baseURL: BOOKING_BASE,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
    ...(TENANT_ID ? { 'x-tenant-id': TENANT_ID } : {}),
  },
});

// ── Guest session ─────────────────────────────────────────────────────────────

export interface GuestSession {
  token:     string;
  expiresAt: string;
}

export async function issueGuestSession(): Promise<GuestSession> {
  const res = await guestClient.post<GuestSession>('/api/v1/guest/session', {});
  return res.data;
}

// ── Guest booking ─────────────────────────────────────────────────────────────

export interface GuestCustomer {
  name:   string;
  email:  string;
  phone?: string;
}

export interface GuestBookingPayload {
  guestSession:     string;
  slotIds:          string[];
  branchId:         string;
  courtId:          string;
  sportId?:         string;
  customer:         GuestCustomer;
  participantCount?: number;
  customerNotes?:   string;
}

export interface GuestBookingResult {
  booking:         Booking;
  qr:              IssuedQrToken | null;
  guestLookupToken: string;
}

export async function createGuestBooking(
  payload: GuestBookingPayload,
): Promise<GuestBookingResult> {
  const res = await guestClient.post<GuestBookingResult>(
    '/api/v1/guest/bookings',
    payload,
  );
  return res.data;
}

// ── Guest booking lookup ──────────────────────────────────────────────────────

export interface GuestBookingView {
  id:                string;
  reference:         string;
  status:            string;
  startsAt:          string;
  endsAt:            string;
  totalDurationMins: number;
  finalPriceMinor:   number | null;
  currency:          string;
  courtId:           string;
  customerName:      string;
}

export async function fetchGuestBooking(token: string): Promise<GuestBookingView> {
  const res = await guestClient.get<GuestBookingView>(
    `/api/v1/guest/lookup/${encodeURIComponent(token)}`,
  );
  return res.data;
}

export const guestLookupKeys = {
  byToken: (token: string) => ['guest-lookup', token] as const,
} as const;

// ── Consumer registration ─────────────────────────────────────────────────────

const IDENTITY_BASE =
  typeof window === 'undefined'
    ? (process.env['IDENTITY_SERVICE_URL']     ?? 'http://localhost:4001')
    : (process.env['NEXT_PUBLIC_IDENTITY_URL'] ?? 'http://localhost:4001');

const identityGuestClient = axios.create({
  baseURL: IDENTITY_BASE,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept:         'application/json',
    ...(TENANT_ID ? { 'x-tenant-id': TENANT_ID } : {}),
  },
});

export interface ConsumerRegisterPayload {
  name:     string;
  email:    string;
  password: string;
}

export interface ConsumerRegisterResult {
  userId:       string;
  accessToken:  string;
  refreshToken: string;
}

export async function registerConsumer(
  payload: ConsumerRegisterPayload,
): Promise<ConsumerRegisterResult> {
  const res = await identityGuestClient.post<ConsumerRegisterResult>(
    '/api/v1/consumer/register',
    payload,
  );
  return res.data;
}
