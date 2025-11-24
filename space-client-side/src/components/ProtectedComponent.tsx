import { hasPermission, hasAnyPermission, Permission } from '../utils/permissions';
import { useAuth } from '../context/useAuth';

interface ProtectedComponentProps {
  children: React.ReactNode;
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export const ProtectedComponent = ({
  children,
  permission,
  permissions,
  requireAll = false,
  fallback = null,
}: ProtectedComponentProps) => {
  const { user } = useAuth();
  const userPermissions = user?.permissions as Permission[];

  // Single permission check
  if (permission) {
    if (!hasPermission(userPermissions, permission)) {
      return <>{fallback}</>;
    }
  }

  // Multiple permissions check
  if (permissions) {
    const hasAccess = requireAll
      ? permissions.every((p) => hasPermission(userPermissions, p))
      : hasAnyPermission(userPermissions, permissions);

    if (!hasAccess) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};

// Convenience components for common use cases
export const AdminOnly = ({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) => (
  <ProtectedComponent permission="system_settings" fallback={fallback}>
    {children}
  </ProtectedComponent>
);

export const ManagerOrAdmin = ({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <ProtectedComponent permissions={['manage_members', 'system_settings']} fallback={fallback}>
    {children}
  </ProtectedComponent>
);

export const DeviceManager = ({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => (
  <ProtectedComponent permission="manage_devices" fallback={fallback}>
    {children}
  </ProtectedComponent>
);
