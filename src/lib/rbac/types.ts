/**
 * RBAC (Role-Based Access Control) Types and Utilities
 * 
 * Defines user roles and permission mappings for ARM.
 */

/**
 * User roles in the system
 * Defined in database: users.role
 */
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

/**
 * Permission actions that can be performed
 */
export type PermissionAction = 
  // Agent management
  | 'agents:create'
  | 'agents:read'
  | 'agents:update'
  | 'agents:delete'
  | 'agents:manage'  // Full control including config
  // Task management
  | 'tasks:create'
  | 'tasks:read'
  | 'tasks:update'
  | 'tasks:delete'
  | 'tasks:assign'
  // Decision management
  | 'decisions:read'
  | 'decisions:override'
  // Escalation management
  | 'escalations:read'
  | 'escalations:resolve'
  // Activity/analytics
  | 'activity:read'
  | 'analytics:read'
  // Team management
  | 'team:read'
  | 'team:invite'
  | 'team:manage'  // Update roles, remove members
  // Billing
  | 'billing:read'
  | 'billing:manage'  // Update plan, payment methods
  // Settings
  | 'settings:read'
  | 'settings:manage'
  // Messages
  | 'messages:read'
  | 'messages:send';

/**
 * Role-based permission matrix
 * Defines what each role can do
 */
export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  owner: [
    // Full access to everything
    'agents:create', 'agents:read', 'agents:update', 'agents:delete', 'agents:manage',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'tasks:assign',
    'decisions:read', 'decisions:override',
    'escalations:read', 'escalations:resolve',
    'activity:read', 'analytics:read',
    'team:read', 'team:invite', 'team:manage',
    'billing:read', 'billing:manage',
    'settings:read', 'settings:manage',
    'messages:read', 'messages:send',
  ],
  admin: [
    // Can manage agents and tasks, view analytics
    'agents:create', 'agents:read', 'agents:update', 'agents:manage',
    'tasks:create', 'tasks:read', 'tasks:update', 'tasks:delete', 'tasks:assign',
    'decisions:read', 'decisions:override',
    'escalations:read', 'escalations:resolve',
    'activity:read', 'analytics:read',
    'team:read',
    'billing:read',
    'settings:read', 'settings:manage',
    'messages:read', 'messages:send',
    // Note: No 'agents:delete', 'team:invite', 'team:manage', 'billing:manage'
  ],
  member: [
    // Can create tasks, view agents
    'agents:read',
    'tasks:create', 'tasks:read', 'tasks:update',
    'decisions:read',
    'escalations:read', 'escalations:resolve',
    'activity:read',
    'team:read',
    'settings:read',
    'messages:read', 'messages:send',
    // Note: No agent management, no analytics, no billing
  ],
  viewer: [
    // Read-only access
    'agents:read',
    'tasks:read',
    'decisions:read',
    'escalations:read',
    'activity:read',
    'team:read',
    'settings:read',
    'messages:read',
  ],
};

/**
 * Role hierarchy for permission inheritance
 * Higher index = more permissions
 */
export const ROLE_HIERARCHY: UserRole[] = ['viewer', 'member', 'admin', 'owner'];

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  return ROLE_PERMISSIONS[role].includes(action);
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: UserRole, actions: PermissionAction[]): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return actions.every(action => permissions.includes(action));
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: UserRole, actions: PermissionAction[]): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return actions.some(action => permissions.includes(action));
}

/**
 * Check if user role is at least the required role level
 * (e.g., admin can do everything member can do)
 */
export function isAtLeastRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const userIndex = ROLE_HIERARCHY.indexOf(userRole);
  const requiredIndex = ROLE_HIERARCHY.indexOf(requiredRole);
  return userIndex >= requiredIndex;
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): PermissionAction[] {
  return [...ROLE_PERMISSIONS[role]];
}

/**
 * User with role information
 */
export interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  name?: string;
}
