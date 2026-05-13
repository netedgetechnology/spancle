import { AuthLayout } from '@/components/layout/auth-layout';

interface AuthRouteLayoutProps {
  children: React.ReactNode;
}

export default function AuthRouteLayout({ children }: AuthRouteLayoutProps): React.ReactElement {
  return <AuthLayout>{children}</AuthLayout>;
}
