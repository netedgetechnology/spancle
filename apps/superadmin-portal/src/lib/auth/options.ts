import CredentialsProvider from 'next-auth/providers/credentials';

import type { NextAuthOptions, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const PLATFORM_TENANT_ID = process.env['PLATFORM_TENANT_ID'] ?? process.env['NEXT_PUBLIC_DEFAULT_TENANT_ID'] ?? '';
const IDENTITY_API       = process.env['IDENTITY_SERVICE_URL'] ?? 'http://127.0.0.1:4001';
const NEXTAUTH_SECRET    = process.env['NEXTAUTH_SECRET'] ?? '';

/**
 * How many seconds before expiry to start the proactive refresh.
 * 60 s gives the request time to complete before the backend rejects the token.
 */
const REFRESH_MARGIN_SECONDS = 60;

interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number; // seconds until the new accessToken expires
}

/**
 * In-flight refresh promise cache — server-side singleton.
 *
 * The NextAuth /api/auth/session route handler runs inside a single Node.js
 * process.  When multiple browser tabs or multiple simultaneous axios
 * getSession() calls arrive while the access token is expired, the jwt
 * callback is invoked for each request concurrently.  Without this guard
 * every invocation would independently POST /api/v1/auth/refresh.  Because
 * the identity service issues single-use refresh tokens, only the first call
 * succeeds — all subsequent ones receive 401, which would incorrectly set
 * error='RefreshAccessTokenError' and sign the user out mid-session.
 *
 * The fix: the first call to need a refresh creates a Promise and caches it
 * here.  Every concurrent call awaits the same Promise.  When it resolves
 * (success or failure) all callers get the same result and the cache is
 * cleared so the next expiry cycle can refresh again.
 *
 * Key properties:
 *   – Only one HTTP request to the identity service per expiry cycle.
 *   – Concurrent callers all get the refreshed token, not an error.
 *   – No stale promise across multiple expiry cycles (cleared on settle).
 *   – Thread-safe: Node.js event loop is single-threaded; no mutex needed.
 */
let refreshPromise: Promise<JWT> | null = null;

async function doRefresh(token: JWT): Promise<JWT> {
  try {
    const res = await fetch(`${IDENTITY_API}/api/v1/auth/refresh`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id':  PLATFORM_TENANT_ID,
      },
      body: JSON.stringify({ refreshToken: token['refreshToken'] }),
    });

    if (!res.ok) {
      throw new Error(`Refresh failed: ${res.status}`);
    }

    const data = await res.json() as TokenPair;

    return {
      ...token,
      accessToken:          data.accessToken,
      refreshToken:         data.refreshToken ?? token['refreshToken'],
      accessTokenExpiresAt: Math.floor(Date.now() / 1000) + data.expiresIn,
      error:                undefined,
    };
  } catch (err) {
    console.error('[NextAuth] refreshAccessToken error:', err);
    return { ...token, error: 'RefreshAccessTokenError' };
  }
}

/**
 * refreshAccessToken()
 *
 * Public entry point used by the jwt callback.
 * Deduplicates concurrent refresh calls by coalescing them onto one Promise.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!refreshPromise) {
    // First caller in this expiry cycle — own the refresh.
    refreshPromise = doRefresh(token).finally(() => {
      // Clear regardless of success or failure so the next cycle can refresh.
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials): Promise<User | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(`${IDENTITY_API}/api/v1/auth/login`, {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id':  PLATFORM_TENANT_ID,
            },
            body: JSON.stringify({
              email:    credentials.email.toLowerCase().trim(),
              password: credentials.password,
            }),
          });

          if (!res.ok) {
            return null;
          }

          const data = await res.json() as {
            accessToken:  string;
            refreshToken: string;
            expiresIn:    number;
            user?: { id: string; role?: string; email?: string };
          };

          if (!data.accessToken) {
            return null;
          }

          return {
            id:                   data.user?.id ?? credentials.email,
            email:                data.user?.email ?? credentials.email,
            role:                 'SUPER_ADMIN',
            accessToken:          data.accessToken,
            refreshToken:         data.refreshToken,
            accessTokenExpiresAt: Math.floor(Date.now() / 1000) + (data.expiresIn ?? 900),
            tenantId:             PLATFORM_TENANT_ID,
          } as User & Record<string, unknown>;
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    /**
     * jwt callback
     *
     * Invoked on every /api/auth/session request and on every server-side
     * getServerSession() call.  The encrypted JWT cookie is the only storage.
     *
     * Initial sign-in (user is present): copy all token fields from authorize().
     * Subsequent calls: if the access token is still fresh, return as-is.
     *                   If within REFRESH_MARGIN_SECONDS of expiry, refresh.
     *
     * Concurrent calls during a single expiry window share one refresh
     * Promise (see refreshPromise above) so the single-use refresh token
     * is consumed exactly once.
     */
    async jwt({ token, user }) {
      // ── Initial sign-in ───────────────────────────────────────────────────
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token['accessToken']          = u['accessToken']          as string;
        token['refreshToken']         = u['refreshToken']         as string;
        token['accessTokenExpiresAt'] = u['accessTokenExpiresAt'] as number;
        token['tenantId']             = u['tenantId']             as string;
        token['role']                 = u['role']                 as string;
        token['error']                = undefined;
        return token;
      }

      // ── Token still fresh ─────────────────────────────────────────────────
      const expiresAt = token['accessTokenExpiresAt'];
      const nowSec    = Math.floor(Date.now() / 1000);

      if (expiresAt && nowSec < expiresAt - REFRESH_MARGIN_SECONDS) {
        return token;
      }

      // ── Token expired or within margin — refresh (deduplicated) ───────────
      return refreshAccessToken(token);
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async session({ session, token }) {
      session.accessToken = token['accessToken'];
      session.tenantId    = token['tenantId'];
      session.user.id     = token.sub ?? '';
      (session.user as Record<string, unknown>)['role'] = token['role'];
      // Propagate refresh errors so the client can force an immediate sign-out
      // without waiting for a 401 from the backend.
      (session as unknown as Record<string, unknown>)['error'] = token['error'];
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60, // 8 h — matches refresh-token lifetime in identity service
  },

  secret: NEXTAUTH_SECRET || undefined,
};
