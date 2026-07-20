import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { ToastProvider }   from '@/components/ui/toast';

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

export default function DashboardRouteLayout({ children }: DashboardRouteLayoutProps): React.ReactElement {
  return (
    <ToastProvider>
      <DashboardLayout navItems={NAV_ITEMS} pageTitle="Platform Administration">
        {children}
      </DashboardLayout>
    </ToastProvider>
  );
}
