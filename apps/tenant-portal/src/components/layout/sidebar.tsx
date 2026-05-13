'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  label: string;
  href:  string;
  icon?: React.ReactNode;
}

interface SidebarProps {
  navItems:   NavItem[];
  logo?:      React.ReactNode;
  isOpen?:    boolean;
  onClose?:   () => void;
}

export function Sidebar({ navItems, logo, isOpen, onClose }: SidebarProps): React.ReactElement {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white',
          'transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Primary sidebar"
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6">
          {logo ?? <span className="text-lg font-bold text-gray-900">Spancle</span>}
          {/* Mobile close */}
          <button
            type="button"
            onClick={onClose}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary navigation">
          <ul className="space-y-0.5" role="list">
            {navItems.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    )}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.icon && (
                      <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
                    )}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
