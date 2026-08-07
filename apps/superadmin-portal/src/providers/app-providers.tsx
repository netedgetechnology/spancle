'use client';


import { QueryClientProvider }  from '@tanstack/react-query';
import { ReactQueryDevtools }   from '@tanstack/react-query-devtools';
import { signOut, SessionProvider } from 'next-auth/react';
import { useEffect }            from 'react';

import { LoadingProvider }       from './loading-provider';
import { NotificationProvider }  from './notification-provider';

import { queryClient }      from '@/lib/api/query-client';
import { onLogoutRequired } from '@/lib/auth/session-events';

/**
 * SessionGuardProvider
 *
 * Listens for 'auth:logout-required' events dispatched by the axios client
 * when it receives a 401 or detects a RefreshAccessTokenError in the session.
 *
 * This is the single place responsible for:
 *   1. Clearing the React Query cache (prevents stale data from reaching
 *      the next user after re-login).
 *   2. Calling signOut() to clear the NextAuth session cookie and redirect
 *      to /login.
 *
 * Keeping this logic here (not in the axios client) maintains the separation
 * between the API transport layer and the auth session lifecycle.
 *
 * Race-condition guard: window events are dispatched synchronously.
 * Multiple 401 responses arriving simultaneously will each call
 * dispatchLogoutRequired(), but the handler calls signOut() only once
 * because NextAuth sets `redirect: true` which navigates immediately and
 * the component unmounts, removing the listener before any subsequent event
 * can fire.  The explicit `handlingLogout` flag provides a belt-and-suspenders
 * guard for the tiny window before navigation completes.
 */
function SessionGuardProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    let handlingLogout = false;

    const unsubscribe = onLogoutRequired(() => {
      if (handlingLogout) {
        return;
      }
      handlingLogout = true;
      queryClient.clear();
      void signOut({ callbackUrl: '/login', redirect: true });
    });

    return unsubscribe;
  }, []);

  return <>{children}</>;
}

/**
 * AppProviders
 *
 * Composes all React context providers.
 *
 * SessionProvider configuration:
 *   refetchInterval={4 * 60}   — polls /api/auth/session every 4 minutes.
 *     The NextAuth jwt callback runs on each poll and silently refreshes
 *     the access token when it is within REFRESH_MARGIN_SECONDS (60 s) of
 *     expiry (token lifetime is 900 s = 15 min; refresh fires at minute 14).
 *
 *   refetchOnWindowFocus       — re-validates the session when the user
 *     returns to the tab after it has been in the background.  Catches
 *     tokens that expired while the tab was hidden.
 *
 * queryClient singleton:
 *   The module-level singleton from query-client.ts is passed to the
 *   provider so that SessionGuardProvider.clear() and the login page's
 *   clear() reach the same instance that all components subscribe to.
 */
export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <SessionProvider
      refetchInterval={4 * 60}
      refetchOnWindowFocus
    >
      <QueryClientProvider client={queryClient}>
        <SessionGuardProvider>
          <LoadingProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </LoadingProvider>
        </SessionGuardProvider>
        {process.env['NODE_ENV'] === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
}
