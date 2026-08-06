import { QueryClient } from '@tanstack/react-query';

/**
 * queryClient — singleton shared across the browser session.
 *
 * Exported directly so the axios interceptor can call queryClient.clear()
 * before forcing a sign-out, preventing stale data from surviving re-login.
 *
 * SSR note: this module is only imported client-side. On the server, API
 * calls go through fetch() directly and do not use this client. Next.js
 * module boundaries (the 'use client' directive on AppProviders) ensure
 * this file is never bundled into the server build.
 *
 * staleTime: 0 on window focus re-fetch — if the user returns to a tab
 * after a token refresh has occurred, all queries refetch automatically
 * so they never show data fetched with an old token.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always refetch on window focus so a user returning to a tab after
      // re-login never sees data fetched under the previous session.
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        // Never retry on 401 — the interceptor already signed the user out.
        if (
          typeof error === 'object' &&
          error !== null &&
          'statusCode' in error &&
          (error as { statusCode: number }).statusCode === 401
        ) {
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      // 0 staleTime means data is always considered stale and will refetch
      // on window focus, preventing stale-session cache hits.
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
    mutations: { retry: 0 },
  },
});

/**
 * Factory for SSR / testing contexts that need an isolated instance.
 * Components should use the exported `queryClient` singleton for the browser.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        retry:      1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
        staleTime:  0,
        gcTime:     5 * 60 * 1000,
      },
      mutations: { retry: 0 },
    },
  });
}
