import { getServerSession } from 'next-auth';
import { authOptions }      from './options';

/** Gets session in Server Components / Route Handlers. */
export async function getServerAuthSession() {
  return getServerSession(authOptions);
}

/** Asserts session and redirects to /login when missing. */
export async function requireServerSession() {
  const { redirect } = await import('next/navigation');
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  return session;
}
