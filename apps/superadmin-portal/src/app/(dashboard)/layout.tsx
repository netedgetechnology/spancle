import { redirect }          from 'next/navigation';
import { getServerSession }  from 'next-auth';
import { authOptions }       from '@/lib/auth/options';
import { DashboardLayout }   from '@/components/layout/dashboard-layout';
import { ToastProvider }     from '@/components/ui/toast';

interface DashboardRouteLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard',   href: '/dashboard'   },
  { label: 'Tenants',     href: '/tenants'     },
  { label: 'Packages',    href: '/packages'    },
  { label: 'Finance',     href: '/finance'     },
  { label: 'Website CMS', href: '/website-cms' },
  { label: 'Venues',      href: '/venues'      },
  { label: 'Settings',    href: '/settings'    },
];

/**
 * Dashboard layout — server-side authentication gate.
 *
 * Runs on the server before any dashboard HTML is generated.
 * If there is no valid SUPER_ADMIN session the response is a redirect
 * to /login — no dashboard markup is ever sent to the client.
 *
 * This is the belt-and-suspenders layer beneath middleware:
 *   - Middleware (Edge): fast token check, redirects most unauthenticated
 *     requests before they reach the Node server.
 *   - This layout: authoritative server-side check, prevents any race
 *     condition between the Edge token resolution and RSC rendering.
 *
 * useSessionGuard() inside DashboardLayout handles mid-session expiry only
 * (already-authenticated users whose token expires while on a dashboard page).
 */
export default async function DashboardRouteLayout({
  children,
}: DashboardRouteLayoutProps): Promise<React.ReactElement> {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as { role?: string })?.role !== 'SUPER_ADMIN') {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <DashboardLayout navItems={NAV_ITEMS} pageTitle="Platform Administration">
        {children}
      </DashboardLayout>
    </ToastProvider>
  );
}
