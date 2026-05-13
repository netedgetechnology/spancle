import { getServerSession } from 'next-auth';

/**
 * Gets session in Server Components / Route Handlers.
 * For Client Components: use useSession() hook instead.
 */
export async function getServerAuthSession() {
  return getServerSession();
}

/**
 * Asserts session exists in a Server Component.
 * Redirects to /login if not authenticated.
 */
export async function requireServerSession() {
  const { redirect } = await import('next/navigation');
  const session = await getServerSession();
  if (!session) redirect('/login');
  return session;
}
