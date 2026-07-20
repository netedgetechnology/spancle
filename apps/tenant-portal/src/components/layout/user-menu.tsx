'use client';
import { useCallback }        from 'react';
import { signOut }            from 'next-auth/react';
import {
  UserMenu as UIKitUserMenu,
}                              from '@spancle/ui-kit';
import type { UserMenuProps }  from '@spancle/ui-kit';
import type { AuthUser }       from '@/hooks/auth.hooks';

export type { UserMenuProps };

export function UserMenu({ user, ...rest }: { user: AuthUser } & Omit<UserMenuProps, 'user' | 'onSignOut'> & { onSignOut?: () => void }): React.ReactElement {
  const defaultSignOut = useCallback(() => void signOut({ callbackUrl: '/login' }), []);
  return <UIKitUserMenu user={user} {...rest} onSignOut={rest.onSignOut ?? defaultSignOut} />;
}
