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
        <button
          type="button"
          onClick={onMenuClick}
          className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          aria-label="Open navigation"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        {title && <h1 className="text-sm font-semibold text-gray-900 truncate">{title}</h1>}
      </div>
      {session?.user && (
        <button
          type="button"
          onClick={() => void signOut({ callbackUrl: '/login' })}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
        >
          Sign out
        </button>
      )}
    </header>
  );
}
