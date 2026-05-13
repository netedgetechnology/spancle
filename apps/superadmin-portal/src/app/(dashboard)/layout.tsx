import { DashboardLayout } from '@/components/layout/dashboard-layout';

interface DashboardRouteLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/'         },
  { label: 'Packages',  href: '/packages' },
  { label: 'Tenants',   href: '/tenants'  },
];

export default function DashboardRouteLayout({ children }: DashboardRouteLayoutProps): React.ReactElement {
  return (
    <DashboardLayout navItems={NAV_ITEMS} pageTitle="Platform Administration">
      {children}
    </DashboardLayout>
  );
}
