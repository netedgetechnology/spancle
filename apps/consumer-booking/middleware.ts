import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * consumer-booking middleware — public-first with selective auth.
 *
 * Public routes:  /, /search, /venues/*, /events/*
 * Protected routes: /bookings/*, /account/*, /checkout/*
 *
 * Tenant resolved from subdomain for white-label support.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, hostname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const tenantSlug =
    request.headers.get('x-tenant-slug') ??
    extractSubdomain(hostname) ??
    request.nextUrl.searchParams.get('tenant');

  const isProtected =
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/checkout');

  if (isProtected) {
    const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET'] });
    if (!token) {
      const url = new URL('/login', request.url);
      url.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();
  if (tenantSlug) response.headers.set('x-tenant-slug', tenantSlug);
  return response;
}

function extractSubdomain(hostname: string): string | null {
  const base = process.env['NEXT_PUBLIC_BASE_DOMAIN'] ?? 'book.spancle.io';
  const sub = hostname.replace(`.${base}`, '');
  return sub !== hostname ? sub : null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
