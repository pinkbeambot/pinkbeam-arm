/**
 * RBAC (Role-Based Access Control) Module
 * 
 * Centralized exports for role-based access control functionality.
 * 
 * @example
 * ```typescript
 * // Server-side usage in API routes
 * import { withRBAC, requirePermission } from '@/lib/rbac';
 * 
 * export const POST = withRBAC('admin', async (request, context) => {
 *   // Only admins can access this
 * });
 * 
 * // Client-side usage in components
 * import { useRBAC } from '@/lib/rbac';
 * 
 * function MyComponent() {
 *   const { can, isOwner } = useRBAC();
 *   return can('agents:create') ? <CreateButton /> : null;
 * }
 * ```
 */

// Types
export type {
  UserRole,
  PermissionAction,
  UserWithRole,
} from './types';

// Permissions
export {
  PermissionChecker,
  createPermissionChecker,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireAtLeastRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAtLeastRole,
  getRolePermissions,
  PermissionGroups,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
} from './permissions';

// Server-side middleware
export {
  withRBAC,
  withPermission,
  withAnyPermission,
  withAtLeastRole,
  createRBACClient,
  getUserRoleFromRequest,
} from './server';

// Client-side hook
export { useRBAC, RBACProvider } from './client';
