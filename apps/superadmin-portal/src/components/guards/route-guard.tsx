'use client';

import { useEffect }      from 'react';
import { useSession }     from 'next-auth/react';
import { useRouter }      from 'next/navigation';

export type RouteGuardType = 'guest' | 'auth' | 'role';

export interface RouteGuardProps {
  type:          RouteGuardType;
  requiredRole?: string;
  redirectTo?:   string;
  fallback?:     React.ReactNode;
  children:      React.ReactNode;
}

const DEFAULTS: Record<RouteGuardType, string> = {
  guest: '/dashboard',
  auth:  '/login',
  role:  '/unauthorized',
};

export function RouteGuard({ type, requiredRole, redirectTo, fallback = null, children }: RouteGuardProps): React.ReactElement | null {
  const { data: session, status } = useSession();
  const router = useRouter();
  const target = redirectTo ?? DEFAULTS[type];

  useEffect(() => {
    if (status === 'loading') return;
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (type === 'guest' && status === 'authenticated') router.replace(target);
    if (type === 'auth'  && status === 'unauthenticated') router.replace(target);
    if (type === 'role') {
      if (status === 'unauthenticated') router.replace('/login');
      else if (status === 'authenticated' && requiredRole && role !== requiredRole) router.replace(target);
    }
  }, [status, session, router, type, requiredRole, target]);

  if (status === 'loading') return fallback as React.ReactElement | null;

  const role = (session?.user as { role?: string } | undefined)?.role;
  const ok =
    type === 'guest' ? status !== 'authenticated' :
    type === 'auth'  ? status === 'authenticated' :
    status === 'authenticated' && (!requiredRole || role === requiredRole);

  return ok ? <>{children}</> : (fallback as React.ReactElement | null);
}
