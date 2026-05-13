'use client';
import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/api/query-client';

export function AppProviders({ children }: { children: React.ReactNode }): React.ReactElement {
  const [queryClient] = useState(() => createQueryClient());
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SessionProvider>
  );
}
