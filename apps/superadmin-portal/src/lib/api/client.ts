import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getSession } from 'next-auth/react';

import type { ApiError }          from '@/types';

import { dispatchLogoutRequired } from '@/lib/auth/session-events';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api';

/**
 * Authenticated API client — transport layer only.
 *
 * Responsibilities (what this file owns):
 *   ✓ Attach the current Bearer token to every outgoing request.
 *   ✓ Attach the x-tenant-id header to every outgoing request.
 *   ✓ Signal that authentication has failed (via dispatchLogoutRequired).
 *   ✓ Normalise error shapes to ApiError.
 *
 * Responsibilities (what this file does NOT own):
 *   ✗ Calling signOut() — that is the auth layer's job.
 *   ✗ Clearing the React Query cache — that is the auth layer's job.
 *   ✗ Redirecting to /login — that is the auth layer's job.
 *
 * When a 401 is received or the session reports a refresh failure, this
 * client dispatches 'auth:logout-required' via the session-events module.
 * AppProviders and useSessionGuard listen for that event and handle sign-out,
 * cache clearing, and redirect.  The two layers are decoupled — neither
 * imports the other at module load time.
 *
 * Token read strategy:
 *   getSession() is called on every request.  It reads the current NextAuth
 *   session cookie via a lightweight internal fetch to /api/auth/session.
 *   After the NextAuth jwt callback silently refreshes the access token and
 *   writes the new token to the cookie, the very next getSession() call
 *   returns the refreshed token with no extra coordination needed here.
 *   The Authorization header is set on the per-request config object, never
 *   on apiClient.defaults.headers (which would persist the token across
 *   requests on the module-level singleton).
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// ── Request interceptor ────────────────────────────────────────────────────

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const session = await getSession();

    // If the server-side refresh failed, signal the auth layer immediately
    // rather than sending a request that will 401 anyway.
    if ((session as Record<string, unknown> | null)?.['error'] === 'RefreshAccessTokenError') {
      dispatchLogoutRequired();
      return Promise.reject(new Error('Session expired — please sign in again.'));
    }

    // Attach token per-request; never cache on defaults.
    if (session?.accessToken) {
      config.headers.set('Authorization', `Bearer ${String(session.accessToken)}`);
    } else {
      // No token — remove any header that may have been inherited from a
      // previous config object to avoid sending a stale Bearer value.
      config.headers.delete('Authorization');
    }

    if (session?.tenantId) {
      config.headers.set('x-tenant-id', String(session.tenantId));
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// ── Response interceptor ───────────────────────────────────────────────────

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        // Backend rejected the token.  Signal the auth layer — it handles
        // sign-out, cache clearing, and redirect.  We do not call signOut()
        // here to keep authentication logic out of the transport layer.
        dispatchLogoutRequired();
        return Promise.reject(error);
      }

      const d = error.response?.data as Record<string, unknown> | undefined;
      const apiError: ApiError = {
        statusCode: (d?.['statusCode'] as number  | undefined) ?? error.response?.status ?? 0,
        message:    (d?.['message']    as string  | undefined) ?? error.message,
        error:      (d?.['error']      as string  | undefined) ?? 'Network Error',
        timestamp:  (d?.['timestamp']  as string  | undefined) ?? new Date().toISOString(),
      };
      return Promise.reject(apiError);
    }
    return Promise.reject(error);
  },
);
