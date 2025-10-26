# 🔒 **Permissions Column Usage Guide**

## **What is the Permissions Column?**

The `permissions` column in the `roles` table stores a **JSON array** of specific capabilities that each role has. This enables **granular access control** throughout your application.

## **📊 Current Permission Structure:**

```json
{
  "user": [
    "view_dashboard", 
    "view_devices"
  ],
  "manager": [
    "view_dashboard", 
    "view_devices", 
    "manage_devices", 
    "view_members"
  ],
  "admin": [
    "view_dashboard", 
    "view_devices", 
    "manage_devices", 
    "view_members", 
    "manage_members", 
    "manage_roles", 
    "system_settings"
  ]
}
```

## **🎯 How to Use Permissions:**

### **1. Frontend Component Protection**
```jsx
// Show button only if user can manage devices
{hasPermission(user.permissions, 'manage_devices') && (
  <button onClick={addDevice}>Add Device</button>
)}

// Show entire section for members with appropriate access
{hasAnyPermission(user.permissions, ['view_members', 'manage_members']) && (
  <MemberSection canEdit={hasPermission(user.permissions, 'manage_members')} />
)}
```

### **2. Route Protection**
```jsx
// In your router
<Route 
  path="/admin" 
  element={
    hasPermission(user.permissions, 'system_settings') 
      ? <AdminPage /> 
      : <UnauthorizedPage />
  } 
/>
```

### **3. Backend API Protection**
```javascript
// Middleware for permission checking
const requirePermission = (permission) => (req, res, next) => {
  if (!req.user.permissions.includes(permission)) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
  next();
};

// Usage in routes
router.post('/devices', requirePermission('manage_devices'), createDevice);
router.get('/members', requirePermission('view_members'), getMembers);
router.put('/members/:id', requirePermission('manage_members'), updateMember);
```

### **4. Menu/Navigation Control**
```jsx
const Navigation = ({ user }) => (
  <nav>
    <Link to="/dashboard">Dashboard</Link>
    
    {hasPermission(user.permissions, 'view_devices') && (
      <Link to="/devices">Devices</Link>
    )}
    
    {hasPermission(user.permissions, 'view_members') && (
      <Link to="/members">Team</Link>
    )}
    
    {hasPermission(user.permissions, 'system_settings') && (
      <Link to="/admin">Admin</Link>
    )}
  </nav>
);
```

## **🚀 Advanced Permission Patterns:**

### **Progressive Access Levels**
```jsx
// Different UI based on permission level
const DeviceCard = ({ device, user }) => (
  <div>
    <h3>{device.name}</h3>
    
    {/* Everyone with view_devices can see basic info */}
    {hasPermission(user.permissions, 'view_devices') && (
      <p>Status: {device.status}</p>
    )}
    
    {/* Only managers+ can see advanced info */}
    {hasPermission(user.permissions, 'manage_devices') && (
      <div>
        <p>Last Updated: {device.lastUpdate}</p>
        <button>Configure</button>
        <button>Reset</button>
      </div>
    )}
    
    {/* Only admins can delete */}
    {hasPermission(user.permissions, 'system_settings') && (
      <button className="danger">Delete Device</button>
    )}
  </div>
);
```

### **Feature Flags**
```jsx
// Enable/disable entire features based on permissions
const FeatureFlags = {
  deviceManagement: (permissions) => hasPermission(permissions, 'manage_devices'),
  teamManagement: (permissions) => hasPermission(permissions, 'manage_members'),
  systemAdmin: (permissions) => hasPermission(permissions, 'system_settings'),
  reporting: (permissions) => hasAnyPermission(permissions, ['manage_devices', 'system_settings'])
};
```

## **🎨 Real-World Examples in Your App:**

### **Dashboard Page**
```jsx
// Dashboard.tsx
{hasPermission(user.permissions, 'view_dashboard') ? (
  <DashboardContent 
    showDeviceControls={hasPermission(user.permissions, 'manage_devices')}
    showTeamSection={hasPermission(user.permissions, 'view_members')}
  />
) : (
  <AccessDenied message="Dashboard access required" />
)}
```

### **Member Page Enhancements**
```jsx
// Member.tsx - Add to your existing component
const MemberCard = ({ member, currentUser }) => (
  <div className={styles.memberCard}>
    {/* Basic info visible to all with view_members permission */}
    <h3>{member.username}</h3>
    <p>{member.email}</p>
    
    {/* Role management only for users with manage_members permission */}
    {hasPermission(currentUser.permissions, 'manage_members') && (
      <div>
        <select 
          value={member.role} 
          onChange={(e) => updateRole(member.id, e.target.value)}
        >
          <option value="user">User</option>
          <option value="manager">Manager</option>
          {hasPermission(currentUser.permissions, 'manage_roles') && (
            <option value="admin">Admin</option>
          )}
        </select>
      </div>
    )}
  </div>
);
```

## **⚙️ Adding New Permissions:**

### **1. Add to Database**
```sql
-- Add new permission to a role
UPDATE roles 
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'new_permission_name')
WHERE name = 'manager';
```

### **2. Update TypeScript Types**
```typescript
export type Permission = 
  | 'view_dashboard'
  | 'view_devices'
  | 'manage_devices'
  | 'view_members'
  | 'manage_members'
  | 'manage_roles'
  | 'system_settings'
  | 'new_permission_name'; // Add here
```

### **3. Use in Components**
```jsx
{hasPermission(user.permissions, 'new_permission_name') && (
  <NewFeatureComponent />
)}
```

## **🔍 Benefits of Permission-Based System:**

1. **🎯 Granular Control** - Precise access management
2. **🔒 Enhanced Security** - Users only see what they need
3. **🚀 Scalable** - Easy to add new permissions
4. **🎨 Better UX** - Clean, role-appropriate interfaces
5. **📊 Audit Ready** - Track who can do what
6. **🔄 Dynamic** - Change permissions without code updates

## **💡 Pro Tips:**

- **Group related permissions** (e.g., all device-related permissions)
- **Use descriptive names** (manage_devices vs admin_devices)
- **Start with fewer permissions** and add more as needed
- **Document each permission's purpose**
- **Test permission combinations** thoroughly

The permissions system transforms your app from basic role checking to enterprise-grade access control! 🎉