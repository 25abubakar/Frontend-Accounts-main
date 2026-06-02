import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  userEmail: string | null;
  userName: string | null;       // loginId used to log in
  userRoles: string[];
  staffId: string | null;        // staffId for RBAC permission lookups
  userPermissions: string[];     // effective feature keys (ALLOW)
  token: string | null;
  isAuthenticated: boolean;

  setLogin: (
    email: string,
    roles?: string[],
    userName?: string,
    staffId?: string | null,
    permissions?: string[],
    token?: string | null        // ← accept token from login response
  ) => void;
  setPermissions: (permissions: string[]) => void;
  setStaffId: (staffId: string) => void;
  setToken: (token: string) => void;
  logout: () => void;

  // Helper: check if user has a permission
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
      token: null,
      isAuthenticated: false,

      setLogin: (email, roles = [], userName, staffId = null, permissions = [], token = null) =>
        set({
          userEmail: email,
          userName: userName ?? email,
          userRoles: roles,
          staffId,
          userPermissions: permissions,
          token,                  // ← persist token so axios interceptor can read it
          isAuthenticated: true,
        }),

      setPermissions: (permissions) =>
        set({ userPermissions: permissions }),

      setStaffId: (staffId) =>
        set({ staffId }),

      setToken: (token) =>
        set({ token }),

      logout: () =>
        set({
          userEmail: null,
          userName: null,
          userRoles: [],
          staffId: null,
          userPermissions: [],
          token: null,
          isAuthenticated: false,
        }),

      hasPermission: (key: string) => {
        const { userRoles, userPermissions } = get();
        // SuperAdmin / Admin bypass all checks
        const isAdmin = userRoles.some(r =>
          ["admin", "superadmin", "super admin", "ceo", "dutyceo"].includes(r.toLowerCase())
        );
        if (isAdmin) return true;
        // Empty permissions = not loaded yet → allow (safe default)
        if (userPermissions.length === 0) return true;
        return userPermissions.includes(key);
      },
    }),
    { name: 'lal-portal-auth' }
  )
);
