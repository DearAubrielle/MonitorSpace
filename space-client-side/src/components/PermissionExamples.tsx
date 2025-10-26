import { hasPermission, hasAnyPermission, Permission } from '../utils/permissions';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: Permission[];
}

interface PermissionExamplesProps {
  user: User;
}

export const PermissionExamples = ({ user }: PermissionExamplesProps) => {
  return (
    <div>
      <h2>Permission-Based UI Examples</h2>
      
      {/* Example 1: Simple permission check */}
      {hasPermission(user.permissions, 'manage_devices') && (
        <button>Add New Device</button>
      )}

      {/* Example 2: Multiple permission options */}
      {hasAnyPermission(user.permissions, ['manage_members', 'view_members']) && (
        <div>
          <h3>Team Management</h3>
          {hasPermission(user.permissions, 'manage_members') ? (
            <button>Edit Member Roles</button>
          ) : (
            <span>View Only Access</span>
          )}
        </div>
      )}

      {/* Example 3: Admin-only features */}
      {hasPermission(user.permissions, 'system_settings') && (
        <div>
          <h3>System Administration</h3>
          <button>System Settings</button>
          <button>Backup Database</button>
          <button>View Logs</button>
        </div>
      )}

      {/* Example 4: Progressive access levels */}
      <div>
        <h3>Dashboard Access</h3>
        {hasPermission(user.permissions, 'view_dashboard') && (
          <div>
            <p>✅ Can view dashboard</p>
            {hasPermission(user.permissions, 'manage_devices') && (
              <p>✅ Can manage devices</p>
            )}
            {hasPermission(user.permissions, 'manage_members') && (
              <p>✅ Can manage team members</p>
            )}
          </div>
        )}
      </div>

      {/* Example 5: Feature availability indicator */}
      <div>
        <h3>Available Features</h3>
        <ul>
          <li style={{ color: hasPermission(user.permissions, 'view_dashboard') ? 'green' : 'gray' }}>
            📊 Dashboard {hasPermission(user.permissions, 'view_dashboard') ? '✓' : '✗'}
          </li>
          <li style={{ color: hasPermission(user.permissions, 'view_devices') ? 'green' : 'gray' }}>
            📱 Devices {hasPermission(user.permissions, 'view_devices') ? '✓' : '✗'}
          </li>
          <li style={{ color: hasPermission(user.permissions, 'manage_devices') ? 'green' : 'gray' }}>
            🔧 Device Management {hasPermission(user.permissions, 'manage_devices') ? '✓' : '✗'}
          </li>
          <li style={{ color: hasPermission(user.permissions, 'view_members') ? 'green' : 'gray' }}>
            👥 Team View {hasPermission(user.permissions, 'view_members') ? '✓' : '✗'}
          </li>
          <li style={{ color: hasPermission(user.permissions, 'manage_members') ? 'green' : 'gray' }}>
            👥 Team Management {hasPermission(user.permissions, 'manage_members') ? '✓' : '✗'}
          </li>
          <li style={{ color: hasPermission(user.permissions, 'system_settings') ? 'green' : 'gray' }}>
            ⚙️ System Settings {hasPermission(user.permissions, 'system_settings') ? '✓' : '✗'}
          </li>
        </ul>
      </div>
    </div>
  );
};