import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { getSession, signOut } from 'next-auth/react';

import type { ApiError } from '@/types';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api';

/**
 * Authenticated API client for the Superadmin portal.
 *
 * ── Request interceptor ────────────────────────────────────────────────────
 * Every request calls getSession() to obtain the current access token.
 * NextAuth fetches /api/auth/session each time and returns the session
 * reflected in the current JWT cookie — including any silently-refreshed
 * access token written by the jwt callback.
 *
 * If the session carries error='RefreshAccessTokenError' (the silent refresh
 * failed because the refresh token itself has expired), we sign the user out
 * immediately rather than firing an API call that will 401.
 *
 * The Authorization header is set per-request on the config object — it is
 * NEVER written to apiClient.defaults.headers, which would persist the old
 * token across requests as a module-level singleton side-effect.
 *
 * ── Response interceptor ──────────────────────────────────────────────────
 * 401 responses mean the backend rejected the token. In all cases we sign
 * out and redirect to /login, clearing the query cache first.
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Guard: only one sign-out in flight at a time to prevent redirect loops.
let signingOut = false;

async function forceSignOut(): Promise<void> {
  if (signingOut || typeof window === 'undefined') {
    return;
  }
  signingOut = true;
  // Clear query cache before redirecting so no stale data survives re-login.
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod: { queryClient: { clear: () => void } } = await import('@/lib/api/query-client') as never;
    mod.queryClient.clear();
  } catch {
    // query-client may not be initialised yet — safe to ignore.
  }
  await signOut({ callbackUrl: '/login', redirect: true });
}

apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    const session = await getSession();

    // Hard sign-out when the refresh token itself has expired.
    if ((session as Record<string, unknown> | null)?.['error'] === 'RefreshAccessTokenError') {
      void forceSignOut();
      return Promise.reject(new Error('Session expired. Please sign in again.'));
    }

    // Set Authorization per-request, never on the shared axios defaults.
    if (session?.accessToken) {
      config.headers.set('Authorization', `Bearer ${String(session.accessToken)}`);
    } else {
      // No token available — remove any previously set header to prevent
      // a stale value from leaking through if headers were inherited.
      config.headers.delete('Authorization');
    }

    if (session?.tenantId) {
      config.headers.set('x-tenant-id', String(session.tenantId));
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401 && typeof window !== 'undefined') {
        // The backend rejected the token. Sign out and redirect to /login.
        void forceSignOut();
        return Promise.reject(error);
      }

      const responseData = error.response?.data as Record<string, unknown> | undefined;
      const apiError: ApiError = {
        statusCode: (responseData?.['statusCode'] as number | undefined) ?? error.response?.status ?? 0,
        message:    (responseData?.['message']    as string | undefined) ?? error.message,
        error:      (responseData?.['error']      as string | undefined) ?? 'Network Error',
        timestamp:  (responseData?.['timestamp']  as string | undefined) ?? new Date().toISOString(),
      };
      return Promise.reject(apiError);
    }
    return Promise.reject(error);
  },
);
