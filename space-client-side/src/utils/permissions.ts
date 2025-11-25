// Permission system types
export type Permission =
  | 'view_dashboard'
  | 'view_devices'
  | 'manage_devices'
  | 'view_members'
  | 'manage_members'
  | 'manage_roles'
  | 'system_settings';

// Utility functions for permission checking
export const hasPermission = (
  userPermissions: Permission[] | null | undefined,
  requiredPermission: Permission
): boolean => {
  return userPermissions ? userPermissions.includes(requiredPermission) : false;
};

export const hasAnyPermission = (
  userPermissions: Permission[] | null | undefined,
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.some((permission: Permission) =>
    userPermissions ? userPermissions.includes(permission) : false
  );
};

export const hasAllPermissions = (
  userPermissions: Permission[] | null | undefined,
  requiredPermissions: Permission[]
): boolean => {
  return requiredPermissions.every((permission: Permission) =>
    userPermissions ? userPermissions.includes(permission) : false
  );
};
