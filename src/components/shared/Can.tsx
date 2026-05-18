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
 */
import { useAuthStore } from '../../store/authStore';

interface CanProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function Can({ permission, children, fallback = null }: CanProps) {
  const hasPermission = useAuthStore(s => s.hasPermission);
  return hasPermission(permission) ? <>{children}</> : <>{fallback}</>;
}
