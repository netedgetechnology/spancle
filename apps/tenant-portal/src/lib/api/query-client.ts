import { QueryClient } from '@tanstack/react-query';

/**
 * Factory — always create a new instance.
 * Never export a singleton — breaks SSR request isolation.
 * Query keys MUST include tenantId to prevent cross-tenant cache hits.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: process.env['NODE_ENV'] === 'production',
        retry: 1,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
        staleTime: 30_000,
        gcTime: 5 * 60 * 1000,
      },
      mutations: { retry: 0 },
    },
  });
}
