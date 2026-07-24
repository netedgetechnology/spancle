'use client';

/**
 * useRequireAuth
 *
 * Redirects unauthenticated visitors to /login?callbackUrl=<current-path>.
 * Returns { isLoading, isAuthenticated } for use in the consuming component.
 *
 * Usage: call at the top of any protected page.
 */

import { useEffect }             from 'react';
import { useSession }            from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

export function useRequireAuth(): { isLoading: boolean; isAuthenticated: boolean } {
  const { status } = useSession();
  const router   = useRouter();
  const pathname = usePathname();

  const isLoading       = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const callbackUrl = encodeURIComponent(pathname);
      router.replace(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  return { isLoading, isAuthenticated };
}
