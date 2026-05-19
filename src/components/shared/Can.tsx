/**
 * Can — Permission guard component
 * Renders children only if the user has the required permission.
 *
 * Usage:
 *   <Can permission="PERSON_REGISTER">
 *     <button>Register Person</button>
 *   </Can>
 *
 *   <Can permission="EMPLOYEE_DELETE" fallback={<span>No access</span>}>
 *     <button>Delete</button>
 *   </Can>
 *
 *   <Can anyPermission={["EMPLOYEE_VIEW", "EMPLOYEE_VIEW_ALL"]}>
 *     <EmployeeList />
 *   </Can>
 *
 *   <Can allPermissions={["EMPLOYEE_VIEW", "EMPLOYEE_EDIT"]}>
 *     <EditEmployeeForm />
 *   </Can>
 */
import { useAuth } from '../../context/AuthContext';

interface CanProps {
  permission?: string;
  anyPermission?: string[];
  allPermissions?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function Can({
  permission,
  anyPermission,
  allPermissions,
  children,
  fallback = null,
}: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyPermission) {
    hasAccess = hasAnyPermission(anyPermission);
  } else if (allPermissions) {
    hasAccess = hasAllPermissions(allPermissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
