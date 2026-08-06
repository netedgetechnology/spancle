'use client';

/**
 * auth.hooks.ts — superadmin-portal
 *
 * Auth hooks using next-auth/react + shared types from @spancle/ui-kit.
 */

import { useCallback, useEffect }        from 'react';
import { useSession, signOut }           from 'next-auth/react';
import { useRouter }                     from 'next/navigation';
import { queryClient }                   from '@/lib/api/query-client';
import type { AuthUser, AuthState, LogoutOptions } from '@spancle/ui-kit';

export type { AuthUser, AuthState, LogoutOptions };
export type { AuthStatus } from '@spancle/ui-kit';

function sessionToUser(session: ReturnType<typeof useSession>['data']): AuthUser | null {
  if (!session?.user) return null;
  const u = session.user as Record<string, unknown>;
  return {
    id:       (u['id']       as string) ?? '',
    email:    (u['email']    as string) ?? '',
    name:     (u['name']     as string) ?? null,
    role:     (u['role']     as string) ?? null,
    tenantId: ((session as unknown as Record<string, unknown>)['tenantId'] as string) ?? null,
    image:    (u['image']    as string) ?? null,
  };
}

export function useAuth(): AuthState {
  const { data: session, status } = useSession();
  return {
    user:            sessionToUser(session),
    status,
    isLoading:       status === 'loading',
    isAuthenticated: status === 'authenticated',
    accessToken:     (session as unknown as Record<string, unknown> | null)?.['accessToken'] as string | undefined,
  };
}

export function useCurrentUser(): AuthUser | null {
  return useAuth().user;
}

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
    if (!auth.isLoading && !auth.isAuthenticated) router.replace(loginUrl);
  }, [auth.isLoading, auth.isAuthenticated, router, loginUrl]);
  return auth;
}

/**
 * useSessionGuard()
 *
 * Detects two conditions that require the user to re-authenticate:
 *
 * 1. NextAuth status becomes 'unauthenticated' (session cookie deleted,
 *    or the NextAuth maxAge has elapsed). Redirects to /session-expired
 *    if the user was previously authenticated in this tab (detected via
 *    sessionStorage), otherwise to /login.
 *
 * 2. Session carries error='RefreshAccessTokenError' — the silent token
 *    refresh failed (refresh token expired / revoked). Force sign-out
 *    immediately, clearing the query cache to prevent stale data.
 *    Redirects to /login.
 *
 * The two redirect targets are different by design:
 *   /session-expired — shows "your session has expired, please sign in again"
 *   /login           — clean login screen for refresh-token failures
 */
export function useSessionGuard(sessionExpiredUrl = '/session-expired'): void {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Condition 2: refresh token has expired / been revoked.
    const sessionError = (session as Record<string, unknown> | null)?.['error'];
    if (sessionError === 'RefreshAccessTokenError') {
      queryClient.clear();
      void signOut({ callbackUrl: '/login', redirect: true });
      return;
    }

    // Condition 1: NextAuth session is gone.
    if (status === 'unauthenticated') {
      if (sessionStorage.getItem('spancle:authenticated') === '1') {
        sessionStorage.removeItem('spancle:authenticated');
        router.replace(sessionExpiredUrl);
      } else {
        router.replace('/login');
      }
      return;
    }

    if (status === 'authenticated') {
      sessionStorage.setItem('spancle:authenticated', '1');
    }
  }, [status, session, router, sessionExpiredUrl]);
}
