import { redirect }          from 'next/navigation';
import { getServerSession }  from 'next-auth';
import { authOptions }       from '@/lib/auth/options';

/**
 * Root page — server-side authentication gate.
 *
 * Evaluated entirely on the server before any HTML is sent to the browser.
 * No client render, no flash of protected content.
 *
 * Authenticated SUPER_ADMIN  → /tenants
 * No session / wrong role    → /login
 *
 * Middleware also enforces this, but relying on middleware alone creates a
 * race: the root page's unconditional redirect fired before middleware could
 * check the token, sending the browser to /tenants and briefly rendering the
 * dashboard layout while getToken() resolved.
 */
export default async function AdminRootPage(): Promise<never> {
  const session = await getServerSession(authOptions);

  if (session && (session.user as { role?: string })?.role === 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  redirect('/login');
}
