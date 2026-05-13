import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * tenant-portal middleware — Edge guard with tenant resolution.
 *
 * Tenant strategy: subdomain extraction.
 *   acme.app.spancle.io -> tenantSlug = 'acme'
 *
 * Rules:
 * 1. Resolve tenantSlug from subdomain or x-tenant-slug header (local dev).
 * 2. All protected routes require session.
 * 3. Session tenantSlug must match resolved slug — cross-tenant breach prevention.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, hostname } = request.nextUrl;

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const tenantSlug = request.headers.get('x-tenant-slug') ?? extractSubdomain(hostname);

  if (!tenantSlug) {
    return NextResponse.redirect(new URL('/no-tenant', request.url));
  }

  if (pathname.startsWith('/login') || pathname.startsWith('/unauthorized')) {
    const response = NextResponse.next();
    response.headers.set('x-tenant-slug', tenantSlug);
    return response;
  }

  const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET'] });

  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  if (token['tenantSlug'] !== tenantSlug) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  const response = NextResponse.next();
  response.headers.set('x-tenant-id', token['tenantId'] as string);
  response.headers.set('x-tenant-slug', tenantSlug);
  return response;
}

function extractSubdomain(hostname: string): string | null {
  const base = process.env['NEXT_PUBLIC_BASE_DOMAIN'] ?? 'app.spancle.io';
  const sub = hostname.replace(`.${base}`, '');
  return sub !== hostname ? sub : null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
