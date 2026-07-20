'use client';

/**
 * auth.hooks.ts — superadmin-portal
 *
 * Auth hooks using next-auth/react + shared types from @spancle/ui-kit.
 * TD-AUTH-1: extract to @spancle/auth-hooks once package supports next peer deps.
 */

import { useCallback, useEffect }        from 'react';
import { useSession, signOut }           from 'next-auth/react';
import { useRouter }                     from 'next/navigation';
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
    tenantId: ((session as Record<string, unknown>)['tenantId'] as string) ?? null,
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
    accessToken:     (session as Record<string, unknown> | null)?.['accessToken'] as string | undefined,
  };
}

export function useCurrentUser(): AuthUser | null {
  return useAuth().user;
}

export function useLogout({ callbackUrl = '/login' }: LogoutOptions = {}): () => Promise<void> {
  return useCallback(async () => {
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

export function useSessionGuard(sessionExpiredUrl = '/session-expired'): void {
  const { status } = useSession();
  const router     = useRouter();
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (status === 'unauthenticated') {
      if (sessionStorage.getItem('spancle:authenticated') === '1') {
        sessionStorage.removeItem('spancle:authenticated');
        router.replace(sessionExpiredUrl);
      }
    }
    if (status === 'authenticated') {
      sessionStorage.setItem('spancle:authenticated', '1');
    }
  }, [status, router, sessionExpiredUrl]);
}
