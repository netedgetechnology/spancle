/**
 * auth.hooks.ts — framework-agnostic type definitions for Spancle auth.
 *
 * Runtime hook implementations live in each Next.js app under src/hooks/auth.hooks.ts
 * because they require next-auth/react and next/navigation (not available in ui-kit).
 *
 * TD-AUTH-1: Extract hooks to a separate @spancle/auth-hooks package once
 * next-auth and next are added as peer dependencies of ui-kit or a new package.
 */
export interface AuthUser {
    id: string;
    email: string;
    name: string | null;
    role: string | null;
    tenantId: string | null;
    image: string | null;
}
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export interface AuthState {
    user: AuthUser | null;
    status: AuthStatus;
    isLoading: boolean;
    isAuthenticated: boolean;
    accessToken: string | undefined;
}
export interface LogoutOptions {
    callbackUrl?: string;
}
//# sourceMappingURL=auth.hooks.d.ts.map