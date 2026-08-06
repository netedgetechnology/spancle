import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions, User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';

const PLATFORM_TENANT_ID = process.env['PLATFORM_TENANT_ID'] ?? process.env['NEXT_PUBLIC_DEFAULT_TENANT_ID'] ?? '';
const IDENTITY_API       = process.env['IDENTITY_SERVICE_URL'] ?? 'http://127.0.0.1:4001';
const NEXTAUTH_SECRET    = process.env['NEXTAUTH_SECRET'] ?? '';

// Refresh the access token 60 seconds before it expires to avoid a
// window where the NextAuth session is valid but the backend rejects it.
const REFRESH_MARGIN_SECONDS = 60;

interface TokenPair {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number; // seconds
}

/**
 * refreshAccessToken()
 *
 * Calls POST /api/v1/auth/refresh with the stored refreshToken.
 * Returns an updated JWT payload on success.
 * Returns the original token with `error: 'RefreshAccessTokenError'`
 * on failure — the client interceptor treats this as a hard sign-out.
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
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
      accessToken:           data.accessToken,
      refreshToken:          data.refreshToken ?? token['refreshToken'],
      accessTokenExpiresAt:  Math.floor(Date.now() / 1000) + data.expiresIn,
      error:                 undefined,
    };
  } catch (err) {
    console.error('[NextAuth] refreshAccessToken error:', err);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
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
        if (!credentials?.email || !credentials?.password) return null;

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

          if (!res.ok) return null;

          const data = await res.json() as {
            accessToken:  string;
            refreshToken: string;
            expiresIn:    number;
            user?: { id: string; role?: string; email?: string };
          };

          if (!data.accessToken) return null;

          return {
            id:                   data.user?.id ?? credentials.email,
            email:                data.user?.email ?? credentials.email,
            role:                 'SUPER_ADMIN',
            accessToken:          data.accessToken,
            refreshToken:         data.refreshToken,
            // Store absolute epoch seconds so the jwt callback can compare
            // against Date.now() without knowing the relative expiresIn again.
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
     * Called on every getSession() / useSession() call and on every
     * server-side request that reads the session cookie.
     *
     * On initial sign-in (`user` is populated): stamp all fields.
     * On subsequent calls: check whether the access token has expired
     * (with a REFRESH_MARGIN_SECONDS grace window) and silently refresh
     * it using the stored refresh token.
     *
     * If the refresh fails (expired refresh token, network error, token
     * revoked): set error='RefreshAccessTokenError' so the client-side
     * interceptor can force a sign-out immediately.
     */
    async jwt({ token, user }) {
      // Initial sign-in — stamp everything from the authorize() return value.
      if (user) {
        const u = user as unknown as Record<string, unknown>;
        token['accessToken']          = u['accessToken']  as string;
        token['refreshToken']         = u['refreshToken'] as string;
        token['accessTokenExpiresAt'] = u['accessTokenExpiresAt'] as number;
        token['tenantId']             = u['tenantId']    as string;
        token['role']                 = u['role']        as string;
        token['error']                = undefined;
        return token;
      }

      // Not yet expired (with margin) — return as-is.
      const expiresAt = token['accessTokenExpiresAt'] as number | undefined;
      const nowSec    = Math.floor(Date.now() / 1000);

      if (expiresAt && nowSec < expiresAt - REFRESH_MARGIN_SECONDS) {
        return token;
      }

      // Access token has expired (or is within the margin) — attempt refresh.
      return refreshAccessToken(token);
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async session({ session, token }) {
      session.accessToken = token['accessToken'] as string | undefined;
      session.tenantId    = token['tenantId']    as string | undefined;
      session.user.id     = token.sub ?? '';
      (session.user as Record<string, unknown>)['role']  = token['role'];
      // Surface the refresh error to the client so it can force sign-out.
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
    maxAge:   8 * 60 * 60, // 8 hours (matches refresh token window)
  },

  secret: NEXTAUTH_SECRET || undefined,
};
