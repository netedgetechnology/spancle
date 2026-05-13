import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * superadmin-portal middleware — Edge route guard.
 *
 * Rules:
 * 1. All routes require a valid session.
 * 2. Session must carry role = SUPER_ADMIN.
 * 3. Unauthenticated -> /login
 * 4. Wrong role -> /unauthorized
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/unauthorized')) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET'] });

  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (token['role'] !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
