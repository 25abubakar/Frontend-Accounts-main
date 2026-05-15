import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

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