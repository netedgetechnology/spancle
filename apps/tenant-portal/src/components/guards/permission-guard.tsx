'use client';

import { useSession } from 'next-auth/react';
import { useRouter }  from 'next/navigation';
import { useEffect }  from 'react';

export type GuardRole = 'super_admin' | 'tenant_admin' | 'tenant_staff' | 'authenticated';

interface PermissionGuardProps {
  /** Minimum role required to view this content. */
  requiredRole?: GuardRole;
  /** Redirect path when not authenticated. Defaults to /login. */
  redirectTo?:   string;
  /** Content to render while session loads. */
  fallback?:     React.ReactNode;
  children:      React.ReactNode;
}

const ROLE_HIERARCHY: Record<GuardRole, number> = {
  authenticated: 0,
  tenant_staff:  1,
  tenant_admin:  2,
  super_admin:   3,
};

/**
 * PermissionGuard — wraps content behind a session/role check.
 *
 * Structural guard only — no business permission evaluation.
 * Business permissions (e.g. "can user X edit invoice Y") are
 * handled at the API / service layer.
 *
 * Usage:
 *   <PermissionGuard requiredRole="super_admin">
 *     <AdminContent />
 *   </PermissionGuard>
 */
export function PermissionGuard({
  requiredRole = 'authenticated',
  redirectTo   = '/login',
  fallback,
  children,
}: PermissionGuardProps): React.ReactElement | null {
  const { data: session, status } = useSession();
  const router = useRouter();

  const userRole = (session?.user as { role?: GuardRole } | undefined)?.role ?? 'authenticated';
  const hasAccess =
    status === 'authenticated' &&
    ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(redirectTo);
    }
  }, [status, router, redirectTo]);

  if (status === 'loading') {
    return (fallback as React.ReactElement | null) ?? null;
  }

  if (!hasAccess) return null;

  return <>{children}</>;
}

/**
 * withPermissionGuard — higher-order component wrapping a page
 * with a PermissionGuard.
 *
 * Usage:
 *   export default withPermissionGuard(MyPage, 'super_admin');
 */
export function withPermissionGuard<P extends object>(
  Component:    React.ComponentType<P>,
  requiredRole: GuardRole,
  redirectTo?:  string,
): React.ComponentType<P> {
  const Guarded = (props: P) => (
    <PermissionGuard requiredRole={requiredRole} redirectTo={redirectTo}>
      <Component {...props} />
    </PermissionGuard>
  );
  Guarded.displayName = `PermissionGuard(${Component.displayName ?? Component.name})`;
  return Guarded;
}
