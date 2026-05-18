import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const IDENTITY_API       = process.env['IDENTITY_SERVICE_URL'] ?? 'http://127.0.0.1:4001';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email'    },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
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
            user?: { id: string; role?: string; email?: string };
          };

          if (!data.accessToken) return null;
          if (data.user?.role && data.user.role !== 'SUPER_ADMIN') return null;

          return {
            id:           data.user?.id ?? credentials.email,
            email:        credentials.email,
            role:         data.user?.role ?? 'SUPER_ADMIN',
            accessToken:  data.accessToken,
            refreshToken: data.refreshToken,
            tenantId:     PLATFORM_TENANT_ID,
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
        token['accessToken']  = (user as any).accessToken;
        token['refreshToken'] = (user as any).refreshToken;
        token['tenantId']     = (user as any).tenantId;
        token['role']         = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken    = token['accessToken'] as string | undefined;
      session.tenantId       = token['tenantId']    as string | undefined;
      session.user.id        = token.sub ?? '';
      (session.user as any).role = token['role'];
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error:  '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge:   8 * 60 * 60,
  },

  secret: process.env['NEXTAUTH_SECRET'],
};
