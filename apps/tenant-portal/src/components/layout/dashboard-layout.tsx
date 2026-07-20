'use client';

import { useState }          from 'react';
import { Sidebar }           from './sidebar';
import { Topbar }            from './topbar';
import { useSessionGuard }   from '@/hooks/auth.hooks';

interface DashboardLayoutProps {
  children:   React.ReactNode;
  navItems?:  Array<{ label: string; href: string; icon?: React.ReactNode }>;
  pageTitle?: string;
}

export function DashboardLayout({
  children,
  navItems = [],
  pageTitle,
}: DashboardLayoutProps): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useSessionGuard();   // detects token expiry mid-session

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        navItems={navItems}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar
          title={pageTitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 sm:p-6"
          role="main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
