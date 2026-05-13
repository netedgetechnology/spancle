import { DashboardLayout } from '@/components/layout/dashboard-layout';

interface DashboardRouteLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Home',         href: '/'           },
  { label: 'Book a Court', href: '/book'       },
  { label: 'My Bookings',  href: '/bookings'   },
  { label: 'Profile',      href: '/profile'    },
];

export default function DashboardRouteLayout({ children }: DashboardRouteLayoutProps): React.ReactElement {
  return (
    <DashboardLayout navItems={NAV_ITEMS} pageTitle="Ace Sports Club">
      {children}
    </DashboardLayout>
  );
}
