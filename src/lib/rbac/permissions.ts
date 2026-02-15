/**
 * RBAC Permission Checking Utilities
 * 
 * Server-side and client-side utilities for checking user permissions.
 */

import { UserRole, PermissionAction, hasPermission, hasAllPermissions, hasAnyPermission, isAtLeastRole } from './types';
export * from './types';

/**
 * Permission checker class for fluent API
 * 
 * Usage:
 * ```typescript
 * const checker = new PermissionChecker('admin');
 * if (checker.can('agents:create')) { ... }
 * if (checker.canAtLeast('admin')) { ... }
 * ```
 */
export class PermissionChecker {
  constructor(private role: UserRole) {}

  /**
   * Check if user can perform a specific action
   */
  can(action: PermissionAction): boolean {
    return hasPermission(this.role, action);
  }

  /**
   * Check if user can perform all of the specified actions
   */
  canAll(actions: PermissionAction[]): boolean {
    return hasAllPermissions(this.role, actions);
  }

  /**
   * Check if user can perform any of the specified actions
   */
  canAny(actions: PermissionAction[]): boolean {
    return hasAnyPermission(this.role, actions);
  }

  /**
   * Check if user is at least the specified role level
   */
  isAtLeast(role: UserRole): boolean {
    return isAtLeastRole(this.role, role);
  }

  /**
   * Check if user is exactly the specified role
   */
  is(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Get the user's role
   */
  getRole(): UserRole {
    return this.role;
  }
}

/**
 * Create a permission checker for a role
 */
export function createPermissionChecker(role: UserRole): PermissionChecker {
  return new PermissionChecker(role);
}

/**
 * Permission guard result
 */
export interface PermissionGuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Guard function for API routes - checks if user has required permission
 * 
 * Usage:
 * ```typescript
 * const guard = requirePermission('admin', 'agents:create');
 * if (!guard.allowed) {
 *   return NextResponse.json({ error: guard.reason }, { status: 403 });
 * }
 * ```
 */
export function requirePermission(
  userRole: UserRole,
  action: PermissionAction
): PermissionGuardResult {
  if (hasPermission(userRole, action)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Role '${userRole}' does not have permission to perform '${action}'`,
  };
}

/**
 * Guard function that requires any of the specified permissions
 */
export function requireAnyPermission(
  userRole: UserRole,
  actions: PermissionAction[]
): PermissionGuardResult {
  if (hasAnyPermission(userRole, actions)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Role '${userRole}' does not have any of the required permissions: ${actions.join(', ')}`,
  };
}

/**
 * Guard function that requires all of the specified permissions
 */
export function requireAllPermissions(
  userRole: UserRole,
  actions: PermissionAction[]
): PermissionGuardResult {
  if (hasAllPermissions(userRole, actions)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Role '${userRole}' does not have all required permissions: ${actions.join(', ')}`,
  };
}

/**
 * Guard function that requires user to be at least a specific role
 */
export function requireAtLeastRole(
  userRole: UserRole,
  minimumRole: UserRole
): PermissionGuardResult {
  if (isAtLeastRole(userRole, minimumRole)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `Role '${userRole}' is insufficient. Minimum required: '${minimumRole}'`,
  };
}

/**
 * Common permission groupings for convenience
 */
export const PermissionGroups = {
  /** Full agent management including create, update, delete */
  AGENT_MANAGE: ['agents:create', 'agents:update', 'agents:delete'] as PermissionAction[],
  /** Task management including create, update, assign */
  TASK_MANAGE: ['tasks:create', 'tasks:update', 'tasks:assign'] as PermissionAction[],
  /** Read-only access to core features */
  READ_ONLY: ['agents:read', 'tasks:read', 'decisions:read', 'escalations:read', 'activity:read'] as PermissionAction[],
  /** Team management permissions */
  TEAM_MANAGE: ['team:invite', 'team:manage'] as PermissionAction[],
  /** Billing management permissions */
  BILLING_MANAGE: ['billing:read', 'billing:manage'] as PermissionAction[],
  /** Settings management permissions */
  SETTINGS_MANAGE: ['settings:read', 'settings:manage'] as PermissionAction[],
} as const;
