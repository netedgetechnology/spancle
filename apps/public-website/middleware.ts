import { type NextRequest, NextResponse } from 'next/server';

/**
 * public-website middleware.
 * No auth required. Sets security headers at edge.
 */
export function middleware(_request: NextRequest): NextResponse {
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'index, follow');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
