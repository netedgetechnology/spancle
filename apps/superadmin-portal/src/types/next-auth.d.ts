import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    accessToken?: string;
    tenantId?: string;
    /** Set to 'RefreshAccessTokenError' when the refresh token has expired. */
    error?: string;
    user: {
      id: string;
      role?: string;
    } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    tenantId?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiresAt?: number;
    tenantId?: string;
    role?: string;
    error?: string;
  }
}
