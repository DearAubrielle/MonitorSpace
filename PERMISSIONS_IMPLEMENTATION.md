# Permission System Implementation

## Overview
The MonitorSpace application now has a comprehensive role-based permission system implemented across the entire application stack.

## Database Structure

### Roles Table
```sql
CREATE TABLE roles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Default Roles
1. **Administrator** - Full system access
   - Permissions: `["view_dashboard", "view_devices", "manage_devices", "view_members", "manage_members", "manage_roles", "system_settings"]`

2. **Manager** - Device and member management
   - Permissions: `["view_dashboard", "view_devices", "manage_devices", "view_members", "manage_members"]`

3. **Operator** - View and basic device management
   - Permissions: `["view_dashboard", "view_devices", "manage_devices"]`

4. **Viewer** - Read-only access
   - Permissions: `["view_dashboard", "view_devices"]`

## Backend Implementation

### Enhanced API Endpoints
- **GET /api/users/profile** - Returns user profile with role and permissions
- **PUT /api/users/:id/role** - Update user role (admin only)
- **GET /api/users** - Enhanced with role information via JOIN queries

### Permission Validation
- Backend validates user permissions for role management operations
- Database JOIN queries fetch user roles and permissions efficiently

## Frontend Implementation

### Permission Utilities (`src/utils/permissions.ts`)
```typescript
export type Permission = 
  | 'view_dashboard'
  | 'view_devices' 
  | 'manage_devices'
  | 'view_members'
  | 'manage_members'
  | 'manage_roles'
  | 'system_settings';

export const hasPermission = (userPermissions: Permission[], requiredPermission: Permission): boolean
export const hasAnyPermission = (userPermissions: Permission[], requiredPermissions: Permission[]): boolean
export const hasAllPermissions = (userPermissions: Permission[], requiredPermissions: Permission[]): boolean
```

### Authentication Context Enhancement
- `AuthProvider` now fetches user permissions during login/refresh
- Permissions stored in authentication context for global access
- User profile includes role information

### Component Protection

#### Dashboard (`src/pages/Dashboard.tsx`)
- ✅ Requires `view_dashboard` permission to access
- ✅ Device sections require `view_devices` permission
- ✅ Early return for unauthorized users

#### Member Management (`src/pages/Member.tsx`)
- ✅ Requires `view_members` permission to access page
- ✅ Role dropdown requires `manage_members` permission
- ✅ Role update functionality protected by `manage_roles` permission

#### Device Management (`src/pages/Devices.tsx`)
- ✅ Requires `view_devices` permission to view devices
- ✅ "Add Device" button requires `manage_devices` permission
- ✅ "Edit" buttons require `manage_devices` permission
- ✅ "View" buttons require `view_devices` permission
- ✅ All device operations (add, edit, view) have permission validation

#### Navigation (`src/components/layout/Sidebar.tsx`)
- ✅ Dashboard link requires `view_dashboard` permission
- ✅ Devices link requires `view_devices` permission
- ✅ Members link requires `view_members` permission
- ✅ Dynamic navigation based on user permissions

### Reusable Components
- `ProtectedComponent` - Wraps components with permission requirements
- Permission checks integrated into existing components without breaking functionality

## Permission Matrix

| Permission | Description | Components Protected |
|------------|-------------|---------------------|
| `view_dashboard` | Access to main dashboard | Dashboard page, navigation |
| `view_devices` | View device information | Device list, device details, navigation |
| `manage_devices` | Add/edit/delete devices | Add device button, edit device button, device forms |
| `view_members` | View team members | Member page, navigation |
| `manage_members` | Edit member information | Role dropdowns in member management |
| `manage_roles` | Change user roles | Role update functionality |
| `system_settings` | System administration | Reserved for future features |

## Security Features

### Frontend Protection
- ✅ UI elements hidden/shown based on permissions
- ✅ Function-level permission checks prevent unauthorized actions
- ✅ Form submissions validate permissions before API calls
- ✅ Navigation dynamically filtered by user permissions

### Backend Protection
- ✅ API endpoints validate permissions from database
- ✅ JWT tokens include user ID for permission lookup
- ✅ Role-based access control at controller level

### Error Handling
- ✅ Clear error messages for permission violations
- ✅ Graceful fallback for unauthorized access attempts
- ✅ User-friendly permission denied messages

## Implementation Status

### ✅ Completed
- Database roles table with permissions
- Backend API with permission validation
- Frontend permission utilities
- Authentication context enhancement
- Dashboard permission integration
- Member management permission system
- Device management permission system
- Navigation permission filtering

### 🔄 Testing Needed
- End-to-end permission testing across all user roles
- Permission inheritance and edge cases
- API security validation

### 🚀 Future Enhancements
- Permission audit logging
- Role inheritance/hierarchy
- Dynamic permission assignment
- Permission-based API rate limiting

## Usage Examples

### Checking Permissions in Components
```typescript
const { user } = useAuth();
const canManageDevices = hasPermission(user?.permissions as Permission[], 'manage_devices');

// Conditional rendering
{canManageDevices && (
  <Button onClick={handleAddDevice}>Add Device</Button>
)}
```

### Multiple Permission Checks
```typescript
const canViewDashboard = hasPermission(user?.permissions as Permission[], 'view_dashboard');
const canViewDevices = hasPermission(user?.permissions as Permission[], 'view_devices');
const hasBasicAccess = hasAnyPermission(user?.permissions as Permission[], ['view_dashboard', 'view_devices']);
```

## Migration Notes
- Existing users need role assignment after database migration
- Default role assignment can be automated or manual
- No breaking changes to existing authentication flow
- Backward compatible with existing JWT implementation

This implementation provides enterprise-grade access control while maintaining a clean, maintainable codebase.