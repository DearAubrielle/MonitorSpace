export const ROLE_ACCESS = {
  dashboard: ['user', 'manager', 'admin'],
  floorplan: ['manager', 'admin'],
  device: ['manager', 'admin'],
  member: ['admin'],
  account: ['user', 'manager', 'admin'],
} as const;

export interface NavigationItem {
  to: string;
  label: string;
  allowedRoles: readonly string[];
}

export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { to: '/dashboard', label: 'Dashboard', allowedRoles: ROLE_ACCESS.dashboard },
  { to: '/floorplan', label: 'Floor Plan', allowedRoles: ROLE_ACCESS.floorplan },
  { to: '/device', label: 'Device', allowedRoles: ROLE_ACCESS.device },
  { to: '/member', label: 'Member', allowedRoles: ROLE_ACCESS.member },
];
