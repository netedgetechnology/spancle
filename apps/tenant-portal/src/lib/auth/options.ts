import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

const IDENTITY_API    = process.env['IDENTITY_SERVICE_URL'] ?? 'http://127.0.0.1:4001';
const NEXTAUTH_SECRET = process.env['NEXTAUTH_SECRET'] ?? '';

if (!NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required for tenant portal');
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant',   type: 'text'     },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.tenantId) return null;

        try {
          const res = await fetch(`${IDENTITY_API}/api/v1/auth/login`, {
            method:  'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-tenant-id':  credentials.tenantId,
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
            user?: { id?: string; role?: string; email?: string; name?: string };
          };

          if (!data.accessToken) return null;

          return {
            id:           data.user?.id    ?? credentials.email,
            email:        data.user?.email ?? credentials.email,
            name:         data.user?.name  ?? null,
            role:         data.user?.role  ?? 'TENANT_ADMIN',
            accessToken:  data.accessToken,
            refreshToken: data.refreshToken,
            tenantId:     credentials.tenantId,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token['accessToken']  = (user as Record<string, unknown>)['accessToken'];
        token['refreshToken'] = (user as Record<string, unknown>)['refreshToken'];
        token['tenantId']     = (user as Record<string, unknown>)['tenantId'];
        token['role']         = (user as Record<string, unknown>)['role'];
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken            = token['accessToken'] as string | undefined;
      session.tenantId               = token['tenantId']    as string | undefined;
      session.user.id                = token.sub ?? '';
      (session.user as Record<string, unknown>)['role']     = token['role'];
      (session.user as Record<string, unknown>)['tenantId'] = token['tenantId'];
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60,   // 8 hours — matches superadmin
  },

  secret: NEXTAUTH_SECRET,
};
