import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userEmail: string | null;
  userRoles: string[];
  // token kept for backward compat but will be empty — backend uses cookies
  token: string | null;
  isAuthenticated: boolean;
  setLogin: (email: string, roles?: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      userEmail: null,
      userRoles: [],
      token: null,
      isAuthenticated: false,
      setLogin: (email, roles = []) =>
        set({ userEmail: email, userRoles: roles, token: null, isAuthenticated: true }),
      logout: () =>
        set({ userEmail: null, userRoles: [], token: null, isAuthenticated: false }),
    }),
    { name: 'lal-portal-auth' }
  )
);
