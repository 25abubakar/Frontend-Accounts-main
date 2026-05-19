/**
 * AuthContext - Global authentication and permission state
 */
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { dataApi, type AccessibleDataResponse } from '../api/dataApi';

interface AuthContextType {
  userPermissions: string[];
  accessibleData: AccessibleDataResponse['data'];
  loading: boolean;
  refreshAccessibleData: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [accessibleData, setAccessibleData] = useState<AccessibleDataResponse['data']>({
    departments: [],
    staff: [],
    persons: [],
    vacancies: [],
    accessGroups: [],
  });
  const [loading, setLoading] = useState(true);

  const refreshAccessibleData = async () => {
    try {
      setLoading(true);
      const response = await dataApi.getAccessibleData();
      setUserPermissions(response.permissions);
      setAccessibleData(response.data);
    } catch (error) {
      console.error('Failed to fetch accessible data:', error);
      // Don't throw - let the app continue with empty permissions
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is logged in (check localStorage)
    const authData = localStorage.getItem('lal-portal-auth');
    if (authData) {
      refreshAccessibleData();
    } else {
      setLoading(false);
    }
  }, []);

  const hasPermission = (permission: string): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(perm => userPermissions.includes(perm));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(perm => userPermissions.includes(perm));
  };

  return (
    <AuthContext.Provider
      value={{
        userPermissions,
        accessibleData,
        loading,
        refreshAccessibleData,
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
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
