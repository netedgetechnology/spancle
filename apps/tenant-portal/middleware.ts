import { type NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * tenant-portal middleware — Edge guard with tenant resolution.
 *
 * Tenant slug resolution order:
 *   1. x-tenant-slug header  (set by Nginx from wildcard regex capture)
 *   2. x-custom-domain header (set by Nginx for custom tenant domains)
 *   3. Subdomain extraction from hostname:
 *      - acme.spancle.com          → slug = 'acme'
 *      - acme.app.spancle.io       → slug = 'acme'  (legacy, transition)
 *      - localhost:3002             → slug from x-tenant-slug header only
 *
 * Reserved slugs are rejected — they are Spancle infrastructure, not tenants.
 */

const RESERVED_SLUGS = new Set([
  'www', 'manage', 'admin', 'api',
  'mail', 'ftp', 'smtp', 'ns1', 'ns2', 'staging', 'dev',
  'cdn', 'static', 'assets', 'status', 'help', 'support',
]);

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, hostname } = request.nextUrl;

  // TEMP_DEBUG
  if (!pathname.startsWith('/_next') && !pathname.startsWith('/favicon')) {
    console.log(`[MW] ${request.method} ${pathname} | host=${hostname}`);
  }

  // Pass-through for static assets and NextAuth internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Resolve tenant slug
  const tenantSlug =
    request.headers.get('x-tenant-slug') ??
    extractSubdomain(hostname);

  // Custom domain support — when nginx sets X-Custom-Domain, skip slug check
  const customDomain = request.headers.get('x-custom-domain');

  if (!tenantSlug && !customDomain) {
    console.log(`[MW] no tenantSlug and no customDomain → /no-tenant`);
    return NextResponse.redirect(new URL('/no-tenant', request.url));
  }

  // Reject reserved infrastructure slugs
  if (tenantSlug && RESERVED_SLUGS.has(tenantSlug.toLowerCase())) {
    console.log(`[MW] RESERVED slug=${tenantSlug} → /no-tenant`);
    return NextResponse.redirect(new URL('/no-tenant', request.url));
  }

  // Public routes within tenant portal — allow without session
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/no-tenant')
  ) {
    const response = NextResponse.next();
    if (tenantSlug) response.headers.set('x-tenant-slug', tenantSlug);
    return response;
  }

  // Require session for all other routes
  const token = await getToken({ req: request, secret: process.env['NEXTAUTH_SECRET'] });

  console.log(`[MW] tenantSlug=${tenantSlug ?? 'null'} token=${token ? 'PRESENT' : 'MISSING'} pathname=${pathname}`);

  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  // Cross-tenant protection: session must match resolved slug
  if (tenantSlug && token['tenantSlug'] !== tenantSlug) {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  console.log(`[MW] PASS-THROUGH tenantSlug=${tenantSlug} pathname=${pathname}`);
  const response = NextResponse.next();
  response.headers.set('x-tenant-id', token['tenantId'] as string);
  if (tenantSlug) response.headers.set('x-tenant-slug', tenantSlug);
  return response;
}

/**
 * Extracts tenant slug from hostname.
 *
 * Supports two patterns:
 *   acme.spancle.com      → 'acme'   (production wildcard)
 *   acme.app.spancle.io   → 'acme'   (legacy, keep during transition)
 */
function extractSubdomain(hostname: string): string | null {
  // Production: acme.spancle.com
  const prodBase  = process.env['NEXT_PUBLIC_BASE_DOMAIN'] ?? 'spancle.com';
  const prodMatch = hostname.replace(`.${prodBase}`, '');
  if (prodMatch !== hostname && !prodMatch.includes('.')) return prodMatch;

  // Legacy: acme.app.spancle.io
  const legacyBase  = 'app.spancle.io';
  const legacyMatch = hostname.replace(`.${legacyBase}`, '');
  if (legacyMatch !== hostname && !legacyMatch.includes('.')) return legacyMatch;

  return null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
