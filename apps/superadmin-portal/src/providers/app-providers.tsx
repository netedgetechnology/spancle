'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools }  from '@tanstack/react-query-devtools';
import { SessionProvider }     from 'next-auth/react';
import { queryClient }         from '@/lib/api/query-client';
import { NotificationProvider } from './notification-provider';
import { LoadingProvider }       from './loading-provider';

/**
 * AppProviders
 *
 * Uses the module-level `queryClient` singleton (not a new instance per
 * render) so the axios interceptor's `queryClient.clear()` call on
 * sign-out reaches the same instance that components are subscribed to.
 *
 * SessionProvider wraps everything so useSession() is available in all
 * child components including the axios interceptor's forceSignOut helper.
 */
export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <SessionProvider
      // refetchInterval: re-check the session every 4 minutes so NextAuth
      // runs the jwt callback and silently refreshes the access token before
      // it expires (token expires at 15 min, we refresh at 14 min).
      refetchInterval={4 * 60}
      // refetchOnWindowFocus: re-validate the session when the user returns
      // to the tab so we catch tokens that expired while the tab was in background.
      refetchOnWindowFocus
    >
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </LoadingProvider>
        {process.env['NODE_ENV'] === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </SessionProvider>
  );
}
