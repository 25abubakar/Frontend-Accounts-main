/**
 * AuthContext — session bootstrap, permissions, accessible data
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { AuthAPI } from '../api/auth';
import { dataApi, type AccessibleDataResponse } from '../api/dataApi';
import { useAuthStore } from '../store/authStore';
import type { UserSessionDto } from '../types/api';

interface AuthContextType {
  session: UserSessionDto | null;
  userPermissions: string[];
  accessibleData: AccessibleDataResponse['data'];
  loading: boolean;
  isFullAccess: boolean;
  loadSession: () => Promise<UserSessionDto | null>;
  refreshAccessibleData: () => Promise<void>;
  applySession: (session: UserSessionDto) => void;
  can: (featureKey: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  clearSession: () => void;
}

const emptyData: AccessibleDataResponse['data'] = {
  departments: [],
  staff: [],
  persons: [],
  vacancies: [],
  accessGroups: [],
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<UserSessionDto | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [accessibleData, setAccessibleData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [isFullAccess, setIsFullAccess] = useState(false);

  const { isAuthenticated, setPermissions, setStaffId, setIsFullAccess: setStoreFullAccess } =
    useAuthStore();

  const applySession = useCallback(
    (s: UserSessionDto) => {
      setSession(s);
      setUserPermissions(s.permissions ?? []);
      setIsFullAccess(!!s.isFullAccess);
      setPermissions(s.permissions ?? []);
      setStoreFullAccess(!!s.isFullAccess);
      if (s.staffId) setStaffId(s.staffId);
    },
    [setPermissions, setStaffId, setStoreFullAccess]
  );

  const clearSession = useCallback(() => {
    setSession(null);
    setUserPermissions([]);
    setIsFullAccess(false);
    setAccessibleData(emptyData);
    setStoreFullAccess(false);
  }, [setStoreFullAccess]);

  const loadSession = useCallback(async (): Promise<UserSessionDto | null> => {
    try {
      const s = await AuthAPI.getSession();
      applySession(s);
      return s;
    } catch (err) {
      console.error('Failed to load session:', err);
      return null;
    }
  }, [applySession]);

  const refreshAccessibleData = useCallback(async () => {
    try {
      const response = await dataApi.getAccessibleData();
      setUserPermissions(prev => (prev.length ? prev : response.permissions));
      setAccessibleData(response.data);
    } catch (err) {
      console.error('Failed to fetch accessible data:', err);
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      if (!isAuthenticated) {
        clearSession();
        return;
      }
      await loadSession();
      await refreshAccessibleData();
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadSession, refreshAccessibleData, clearSession]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const onNavUpdate = () => {
      if (isAuthenticated) loadSession();
    };
    const onLogout = () => clearSession();
    window.addEventListener('navigation-updated', onNavUpdate);
    window.addEventListener('user-logged-out', onLogout);
    return () => {
      window.removeEventListener('navigation-updated', onNavUpdate);
      window.removeEventListener('user-logged-out', onLogout);
    };
  }, [isAuthenticated, loadSession, clearSession]);

  const can = useCallback(
    (featureKey: string): boolean => {
      if (isFullAccess) return true;
      return userPermissions.includes(featureKey);
    },
    [isFullAccess, userPermissions]
  );

  const hasPermission = can;

  const hasAnyPermission = useCallback(
    (permissions: string[]) => permissions.some(p => can(p)),
    [can]
  );

  const hasAllPermissions = useCallback(
    (permissions: string[]) => permissions.every(p => can(p)),
    [can]
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        userPermissions,
        accessibleData,
        loading,
        isFullAccess,
        loadSession,
        refreshAccessibleData,
        applySession,
        can,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        clearSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
