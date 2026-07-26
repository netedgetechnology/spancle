import { DashboardLayout } from '@/components/layout/dashboard-layout';

interface DashboardRouteLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard'    },
  { label: 'Bookings',     href: '/bookings'     },
  { label: 'Calendar',     href: '/calendar'     },
  { label: 'Customers',    href: '/customers'    },
  { label: 'Courts',       href: '/courts'       },
  { label: 'Branches',     href: '/branches'     },
  { label: 'Invoices',     href: '/invoices'     },
  { label: 'Settlements',  href: '/settlements'  },
  { label: 'Revenue',      href: '/revenue'      },
  { label: 'Analytics',    href: '/analytics'    },
  { label: 'Blog',         href: '/blog'         },
  { label: 'Settings',     href: '/settings'     },
];

export default function DashboardRouteLayout({ children }: DashboardRouteLayoutProps): React.ReactElement {
  return (
    <DashboardLayout navItems={NAV_ITEMS} pageTitle="Dashboard">
      {children}
    </DashboardLayout>
  );
}
