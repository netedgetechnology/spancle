import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string | null;
  tenantSlug: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isHydrated: boolean;
  setUser: (user: AuthUser | null) => void;
  setHydrated: () => void;
  clearUser: () => void;
}

/**
 * Zustand auth store — mirrors NextAuth session for synchronous access.
 * Source of truth is the session. Never persist to localStorage.
 */
export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isHydrated: false,
  setUser: (user) => set({ user }),
  setHydrated: () => set({ isHydrated: true }),
  clearUser: () => set({ user: null }),
}));
