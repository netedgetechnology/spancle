import { DashboardLayout } from '@/components/layout/dashboard-layout';

interface DashboardRouteLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard',    href: '/dashboard'    },
  { label: 'Analytics',    href: '/analytics'    },
  { label: 'Branches',     href: '/branches'     },
  { label: 'Sports',       href: '/sports'       },
  { label: 'Courts',       href: '/courts'       },
  { label: 'Pricing',      href: '/pricing'      },
  { label: 'Calendar',     href: '/calendar'     },
  { label: 'Blog',         href: '/blog'         },
  { label: 'Homepage',     href: '/homepage'     },
  { label: 'Subscription', href: '/subscription' },
];

export default function DashboardRouteLayout({ children }: DashboardRouteLayoutProps): React.ReactElement {
  return (
    <DashboardLayout navItems={NAV_ITEMS} pageTitle="Dashboard">
      {children}
    </DashboardLayout>
  );
}
