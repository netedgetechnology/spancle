/**
 * payment.api.ts
 *
 * Typed client for POST /api/v1/payments/initiate.
 * Called after booking creation — before the Stripe Elements form is shown.
 * Authenticated endpoint — uses the shared apiClient (injects session token).
 */

import axios         from 'axios';
import { apiClient } from '@/lib/api/client';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const TENANT_ID = process.env['NEXT_PUBLIC_TENANT_ID'] ?? '';

/** Unauthenticated client for guest payment initiation. */
const publicPaymentClient = axios.create({
  baseURL: BOOKING_BASE,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    ...(TENANT_ID ? { 'x-tenant-id': TENANT_ID } : {}),
  },
});

export interface InitiatePaymentPayload {
  bookingId:     string;
  branchId:      string;
  amountMinor:   number;
  currency:      string;
  customerEmail?: string;
  customerId?:   string;
}

export interface InitiatePaymentResult {
  bookingPaymentId:  string;
  financePaymentId:  string;
  /** Present for Stripe (used by Elements). Absent when idempotent retry. */
  clientSecret:      string | undefined;
  /** Stripe PaymentIntent id or Razorpay orderId */
  gatewayPaymentId:  string;
  gatewayName:       string;
  idempotencyKey:    string;
}

/**
 * initiatePayment — authenticated (member) path.
 * Uses apiClient which injects the session JWT.
 */
export async function initiatePayment(
  payload: InitiatePaymentPayload,
): Promise<InitiatePaymentResult> {
  const res = await apiClient.post<InitiatePaymentResult>(
    '/api/v1/payments/initiate',
    payload,
  );
  return res.data;
}

/**
 * initiateGuestPayment — unauthenticated (guest) path.
 * Uses guestClient (no JWT, injects x-tenant-id from env).
 * Note: backend enforces ownership via booking creation idempotency;
 * the bookingId was returned from POST /guest/bookings on this same device.
 */
export async function initiateGuestPayment(
  payload: InitiatePaymentPayload,
): Promise<InitiatePaymentResult> {
  const res = await publicPaymentClient.post<InitiatePaymentResult>(
    '/api/v1/payments/initiate',
    payload,
  );
  return res.data;
}
