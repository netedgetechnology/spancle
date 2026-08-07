'use client';

/**
 * auth.hooks.ts — superadmin-portal
 *
 * Auth hooks using next-auth/react + shared types from @spancle/ui-kit.
 * TD-AUTH-1: extract to @spancle/auth-hooks once package supports next peer deps.
 */

import { useRouter }              from 'next/navigation';
import { signOut, useSession }    from 'next-auth/react';
import { useCallback, useEffect } from 'react';


import type { AuthState, AuthUser, LogoutOptions } from '@spancle/ui-kit';

import { queryClient } from '@/lib/api/query-client';

export type { AuthState, AuthUser, LogoutOptions };
export type { AuthStatus } from '@spancle/ui-kit';

function sessionToUser(session: ReturnType<typeof useSession>['data']): AuthUser | null {
  if (!session?.user) {
    return null;
  }
  const u = session.user as Record<string, unknown>;
  return {
    id:       (u['id']    as string) ?? '',
    email:    (u['email'] as string) ?? '',
    name:     (u['name']  as string) ?? null,
    role:     (u['role']  as string) ?? null,
    tenantId: ((session as unknown as Record<string, unknown>)['tenantId'] as string) ?? null,
    image:    (u['image'] as string) ?? null,
  };
}

export function useAuth(): AuthState {
  const { data: session, status } = useSession();
  return {
    user:            sessionToUser(session),
    status,
    isLoading:       status === 'loading',
    isAuthenticated: status === 'authenticated',
    accessToken:     (session as unknown as Record<string, unknown> | null)
      ?.['accessToken'] as string | undefined,
  };
}

export function useCurrentUser(): AuthUser | null {
  return useAuth().user;
}

/**
 * useLogout()
 *
 * Returns a stable callback that clears the React Query cache and signs
 * the user out.  Cache is cleared first so no stale data is visible if
 * Next.js re-renders the login page before navigation completes.
 */
export function useLogout({ callbackUrl = '/login' }: LogoutOptions = {}): () => Promise<void> {
  return useCallback(async () => {
    queryClient.clear();
    await signOut({ callbackUrl, redirect: true });
  }, [callbackUrl]);
}

export function useRequireAuth(loginUrl = '/login'): AuthState {
  const auth   = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace(loginUrl);
    }
  }, [auth.isLoading, auth.isAuthenticated, router, loginUrl]);
  return auth;
}

/**
 * useSessionGuard()
 *
 * Watches the NextAuth session status for two conditions requiring
 * re-authentication, and redirects accordingly.
 *
 * Condition A — RefreshAccessTokenError in the session.
 *   The server-side jwt callback could not refresh the access token
 *   (refresh token expired, revoked, or network error).
 *   The 'auth:logout-required' event is already dispatched by the axios
 *   interceptor when it reads this error before each request.  However,
 *   if the user is idle (no in-flight requests), this hook provides a
 *   second signal path by calling signOut() directly when it detects the
 *   error in the session returned by SessionProvider's 4-minute poll.
 *   The cache is cleared here too so the login page renders clean.
 *
 * Condition B — status becomes 'unauthenticated'.
 *   Covers session cookie deletion, NextAuth maxAge elapsing, and
 *   sign-out from another tab.  If the user was previously authenticated
 *   in this tab (tracked via sessionStorage), they are redirected to the
 *   /session-expired page so they see an informative message.  Otherwise
 *   they go straight to /login.
 *
 * Note: sign-out triggered by 401 responses is handled by SessionGuardProvider
 * in AppProviders, not here.  This hook handles the session-layer signals only.
 */
export function useSessionGuard(sessionExpiredUrl = '/session-expired'): void {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    // ── Condition A: server-side refresh failed ────────────────────────────
    const sessionError = (session as Record<string, unknown> | null)?.['error'];
    if (sessionError === 'RefreshAccessTokenError') {
      queryClient.clear();
      void signOut({ callbackUrl: '/login', redirect: true });
      return;
    }

    // ── Condition B: session cookie gone / timed out ───────────────────────
    if (status === 'unauthenticated') {
      const prevAuth =
        (sessionStorage as Storage).getItem('spancle:authenticated') === '1';
      if (prevAuth) {
        (sessionStorage as Storage).removeItem('spancle:authenticated');
        router.replace(sessionExpiredUrl);
      } else {
        router.replace('/login');
      }
      return;
    }

    // Mark the tab as having completed an authenticated session.
    if (status === 'authenticated') {
      (sessionStorage as Storage).setItem('spancle:authenticated', '1');
    }
  }, [status, session, router, sessionExpiredUrl]);
}
