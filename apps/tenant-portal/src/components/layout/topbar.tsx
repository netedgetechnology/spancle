'use client';

import { signOut, useSession } from 'next-auth/react';

interface TopbarProps {
  title?:       string;
  onMenuClick?: () => void;
}

export function Topbar({ title, onMenuClick }: TopbarProps): React.ReactElement {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuClick}
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          aria-label="Open navigation"
          aria-haspopup="true"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        {title && (
          <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {session?.user && (
          <>
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 leading-none">
                {session.user.name ?? session.user.email}
              </p>
              {session.user.name && session.user.email && (
                <p className="text-xs text-gray-400 mt-0.5">{session.user.email}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: '/login' })}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 whitespace-nowrap"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
