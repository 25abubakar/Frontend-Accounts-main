import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useAuth } from "../../context/AuthContext";
import { ReactNode } from "react";

export default function ProtectedRoute() {
  const location = useLocation();
  
  // Read the actual authentication status directly from Zustand
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    // Kicks unauthorized users back to login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allows authenticated users to see the dashboard
  return <Outlet />;
}

/**
 * ProtectedRoute with permission check
 * Use this for routes that require specific permissions
 */
interface PermissionProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredPermissions?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions; if false, ANY permission
}

export function PermissionProtectedRoute({
  children,
  requiredPermission,
  requiredPermissions,
  requireAll = false,
}: PermissionProtectedRouteProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-slate-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  // Check single permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/access-denied" state={{ from: location }} replace />;
  }

  // Check multiple permissions
  if (requiredPermissions) {
    const hasAccess = requireAll
      ? hasAllPermissions(requiredPermissions)
      : hasAnyPermission(requiredPermissions);

    if (!hasAccess) {
      return <Navigate to="/access-denied" state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}