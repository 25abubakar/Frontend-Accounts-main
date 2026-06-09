import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userEmail: string | null;
  userName: string | null;
  userRoles: string[];
  staffId: string | null;
  userPermissions: string[];
  isFullAccess: boolean;
  token: string | null;
  isAuthenticated: boolean;

  setLogin: (
    email: string,
    roles?: string[],
    userName?: string,
    staffId?: string | null,
    permissions?: string[],
    token?: string | null
  ) => void;
  setPermissions: (permissions: string[]) => void;
  setStaffId: (staffId: string) => void;
  setToken: (token: string) => void;
  setIsFullAccess: (value: boolean) => void;
  logout: () => void;
  hasPermission: (key: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userEmail: null,
      userName: null,
      userRoles: [],
      staffId: null,
      userPermissions: [],
      isFullAccess: false,
      token: null,
      isAuthenticated: false,

      setLogin: (email, roles = [], userName, staffId = null, permissions = [], token = null) =>
        set({
          userEmail: email,
          userName: userName ?? email,
          userRoles: roles,
          staffId,
          userPermissions: permissions,
          token,
          isAuthenticated: true,
        }),

      setPermissions: permissions => set({ userPermissions: permissions }),

      setStaffId: staffId => set({ staffId }),

      setToken: token => set({ token }),

      setIsFullAccess: isFullAccess => set({ isFullAccess }),

      logout: () =>
        set({
          userEmail: null,
          userName: null,
          userRoles: [],
          staffId: null,
          userPermissions: [],
          isFullAccess: false,
          token: null,
          isAuthenticated: false,
        }),

      hasPermission: (key: string) => {
        const { userRoles, userPermissions, isFullAccess } = get();
        if (isFullAccess) return true;
        const isAdmin = userRoles.some(r =>
          ['admin', 'superadmin', 'super admin', 'ceo', 'dutyceo'].includes(r.toLowerCase())
        );
        if (isAdmin) return true;
        if (userPermissions.length === 0) return true;
        return userPermissions.includes(key);
      },
    }),
    { name: 'lal-portal-auth' }
  )
);
