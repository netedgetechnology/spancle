'use client';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/api/query-client';
import { NotificationProvider } from './notification-provider';
import { LoadingProvider }       from './loading-provider';

export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <LoadingProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </LoadingProvider>
        {process.env['NODE_ENV'] === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </SessionProvider>
  );
}
