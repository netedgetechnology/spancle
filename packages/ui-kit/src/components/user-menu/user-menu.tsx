'use client';

/**
 * @spancle/ui-kit — user-menu.tsx
 *
 * Authenticated user dropdown for the topbar.
 * App-agnostic: receives AuthUser as a prop and a signOut callback.
 * Does not import next-auth directly — caller passes the signOut fn.
 *
 * No profile editing. Links only.
 */

import { useState, useRef, useEffect } from 'react';
// AuthUser is defined inline here to avoid importing from hooks (which require next-auth)
export interface AuthUser {
  id:       string;
  email:    string;
  name:     string | null;
  role:     string | null;
  tenantId: string | null;
  image:    string | null;
}

export interface UserMenuLink {
  label: string;
  href:  string;
  icon?: 'user' | 'settings' | 'key';
}

export interface UserMenuProps {
  user:          AuthUser;
  onSignOut:     () => void;
  links?:        UserMenuLink[];
  className?:    string;
}

const DEFAULT_LINKS: UserMenuLink[] = [
  { label: 'Profile',  href: '/profile',  icon: 'user'     },
  { label: 'Settings', href: '/settings', icon: 'settings' },
];

// ── Icon paths ────────────────────────────────────────────────────────────────

const ICONS: Record<string, string> = {
  user:     'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
  settings: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z',
  key:      'M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z',
};

// ── Component ─────────────────────────────────────────────────────────────────

export function UserMenu({ user, onSignOut, links = DEFAULT_LINKS }: UserMenuProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const ref             = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const displayName = user.name ?? user.email;
  const initial     = (displayName[0] ?? '?').toUpperCase();

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
          'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          open ? 'bg-gray-100' : '',
        ].join(' ')}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="User menu"
      >
        <span
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {initial}
        </span>
        <span className="hidden sm:block max-w-[120px] truncate font-medium text-gray-700">
          {displayName}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div
          role="menu"
          aria-label="User menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-xl border border-gray-200 bg-white shadow-lg divide-y divide-gray-100"
        >
          {/* Header */}
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            {user.name && <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>}
            {user.role && (
              <span className="mt-1.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                {user.role.replace(/_/g, ' ').toLowerCase()}
              </span>
            )}
          </div>

          {/* Nav links */}
          <div className="py-1" role="group">
            {links.map((link) => (
              <a
                key={link.href}
                role="menuitem"
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {link.icon && ICONS[link.icon] && (
                  <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[link.icon]} />
                  </svg>
                )}
                {link.label}
              </a>
            ))}
          </div>

          {/* Sign out */}
          <div className="py-1">
            <button
              role="menuitem"
              type="button"
              onClick={onSignOut}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
