/**
 * qr.api.ts
 *
 * Typed API client for QR token endpoints.
 *
 * ── RBAC summary (from QrController inspection) ──────────────────────────────
 *
 * POST /qr/issue          → TENANT_ADMIN, TENANT_MANAGER only
 *                           Consumer PLAYER role cannot call this.
 *                           rawToken returned ONCE — never retrievable again.
 *
 * GET  /qr/booking/:id    → TENANT_ADMIN, TENANT_MANAGER only
 *                           Returns token metadata (no rawToken, no qrContent).
 *                           Consumer PLAYER role cannot call this.
 *
 * POST /qr/verify         → @Public — no auth required
 *                           Used by smart access devices; NOT for consumer display.
 *
 * Consumer impact: a PLAYER session cannot obtain a QR image from any existing
 * endpoint. The consumer app displays token metadata (when available via admin
 * sessions) and check-in instructions for all other cases.
 *
 * Future: a consumer-issue endpoint (POST /qr/me/issue) scoped to PLAYER role
 * would unblock consumer-side QR display. Track as CONSUMER_QR_ENDPOINT.
 */

import { apiClient }    from '@/lib/api/client';
import type { QrToken, IssuedQrToken } from '@/types/booking.types';

const BOOKING_BASE =
  typeof window === 'undefined'
    ? (process.env['BOOKING_SERVICE_URL']     ?? 'http://localhost:3003')
    : (process.env['NEXT_PUBLIC_BOOKING_URL'] ?? 'http://localhost:3003');

const BASE = `${BOOKING_BASE}/api/v1/qr`;

// ── Query keys ────────────────────────────────────────────────────────────────

export const qrKeys = {
  all:        ()              => ['qr-tokens'] as const,
  byBooking:  (bookingId: string) => [...qrKeys.all(), 'booking', bookingId] as const,
  detail:     (tokenId: string)   => [...qrKeys.all(), tokenId]              as const,
} as const;

// ── Read endpoints ────────────────────────────────────────────────────────────

/**
 * fetchTokensForBooking — GET /qr/booking/:bookingId
 *
 * Returns token metadata (never rawToken or qrContent).
 * RBAC: TENANT_ADMIN, TENANT_MANAGER only.
 * Will return 403 for PLAYER sessions.
 */
export async function fetchTokensForBooking(bookingId: string): Promise<QrToken[]> {
  const res = await apiClient.get<QrToken[]>(
    `${BASE}/booking/${bookingId}`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

/**
 * fetchToken — GET /qr/:tokenId
 *
 * Returns a single token's metadata.
 * RBAC: TENANT_ADMIN, TENANT_MANAGER only.
 */
export async function fetchToken(tokenId: string): Promise<QrToken> {
  const res = await apiClient.get<QrToken>(`${BASE}/${tokenId}`, { baseURL: BOOKING_BASE });
  return res.data;
}

// ── Consumer endpoint (PLAYER role) ──────────────────────────────────────────

/**
 * getConsumerQr — GET /api/v1/bookings/:bookingId/qr
 *
 * Consumer-facing QR endpoint — PLAYER role only.
 * Ownership: booking.userId must equal the authenticated user's profile ID.
 * Returns IssuedQrToken including rawToken and qrContent.
 * rawToken and qrContent are returned ONCE per call (re-issuing revokes the old token).
 *
 * Throws 403 if the booking does not belong to the authenticated user.
 * Throws 422 if the booking is not in an eligible status (confirmed/pending_payment).
 */
export async function getConsumerQr(bookingId: string): Promise<IssuedQrToken> {
  const res = await apiClient.get<IssuedQrToken>(
    `${BOOKING_BASE}/api/v1/bookings/${bookingId}/qr`,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}

export const consumerQrKeys = {
  forBooking: (bookingId: string) => ['consumer-qr', bookingId] as const,
} as const;

/**
 * issueQrToken — POST /qr/issue
 *
 * Issues a QR token for a booking. Returns rawToken and qrContent ONCE.
 * qrContent URI format: spancle://verify?t={rawToken}&p={purpose}
 * RBAC: TENANT_ADMIN, TENANT_MANAGER only.
 * NOT callable by consumer PLAYER sessions.
 *
 * Included for completeness — will be called by admin sessions, not consumer.
 */
export async function issueQrToken(params: {
  bookingId:   string;
  purpose?:    string;
  ttlMinutes?: number;
  maxUses?:    number;
}): Promise<IssuedQrToken> {
  const res = await apiClient.post<IssuedQrToken>(
    `${BASE}/issue`,
    params,
    { baseURL: BOOKING_BASE },
  );
  return res.data;
}
