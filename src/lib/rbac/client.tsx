'use client';

/**
 * Client-side RBAC Hook and Context
 * 
 * Provides React hook for checking permissions in components.
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { UserRole, PermissionAction } from './types';
import { PermissionChecker, hasPermission, isAtLeastRole } from './permissions';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * User with role information
 */
interface UserWithRole {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

/**
 * RBAC Context type
 */
interface RBACContextType {
  /** Current user with role */
  user: UserWithRole | null;
  /** Whether RBAC data is loading */
  isLoading: boolean;
  /** Error if loading failed */
  error: Error | null;
  /** Permission checker instance */
  permissionChecker: PermissionChecker | null;
  /** Check if user can perform an action */
  can: (action: PermissionAction) => boolean;
  /** Check if user can perform all actions */
  canAll: (actions: PermissionAction[]) => boolean;
  /** Check if user can perform any action */
  canAny: (actions: PermissionAction[]) => boolean;
  /** Check if user is at least the specified role */
  isAtLeast: (role: UserRole) => boolean;
  /** Check if user is exactly the specified role */
  is: (role: UserRole) => boolean;
  /** Convenience booleans for common checks */
  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  isViewer: boolean;
  /** Refetch user role data */
  refetch: () => Promise<void>;
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

interface RBACProviderProps {
  children: ReactNode;
  /** Auth token for API calls */
  authToken?: string;
}

/**
 * RBAC Provider Component
 * 
 * Wrap your app with this to provide RBAC context:
 * ```tsx
 * <RBACProvider authToken={session.access_token}>
 *   <App />
 * </RBACProvider>
 * ```
 */
export function RBACProvider({ children, authToken }: RBACProviderProps) {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUserRole = useCallback(async () => {
    if (!authToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setUser(null);
          return;
        }
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      const data = await response.json();
      
      setUser({
        id: data.id,
        email: data.email,
        role: data.role as UserRole,
        name: data.name,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load user role';
      setError(new Error(errorMessage));
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    fetchUserRole();
  }, [fetchUserRole]);

  // Create permission checker
  const permissionChecker = useMemo(() => {
    if (!user) return null;
    return new PermissionChecker(user.role);
  }, [user]);

  // Permission checking functions
  const can = useCallback((action: PermissionAction): boolean => {
    if (!user) return false;
    return hasPermission(user.role, action);
  }, [user]);

  const canAll = useCallback((actions: PermissionAction[]): boolean => {
    if (!user) return false;
    return actions.every(action => hasPermission(user.role, action));
  }, [user]);

  const canAny = useCallback((actions: PermissionAction[]): boolean => {
    if (!user) return false;
    return actions.some(action => hasPermission(user.role, action));
  }, [user]);

  const isAtLeast = useCallback((role: UserRole): boolean => {
    if (!user) return false;
    return isAtLeastRole(user.role, role);
  }, [user]);

  const is = useCallback((role: UserRole): boolean => {
    if (!user) return false;
    return user.role === role;
  }, [user]);

  // Convenience booleans
  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin';
  const isMember = user?.role === 'member';
  const isViewer = user?.role === 'viewer';

  const value: RBACContextType = {
    user,
    isLoading,
    error,
    permissionChecker,
    can,
    canAll,
    canAny,
    isAtLeast,
    is,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    refetch: fetchUserRole,
  };

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

/**
 * useRBAC Hook
 * 
 * Use this hook to check permissions in your components:
 * 
 * @example
 * ```tsx
 * function AgentList() {
 *   const { can, isOwner, isLoading } = useRBAC();
 *   
 *   if (isLoading) return <Loading />;
 *   
 *   return (
 *     <div>
 *       {can('agents:create') && <CreateAgentButton />}
 *       <AgentTable />
 *       {isOwner && <ManageBillingButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRBAC(): RBACContextType {
  const context = useContext(RBACContext);
  
  if (context === undefined) {
    throw new Error('useRBAC must be used within an RBACProvider');
  }
  
  return context;
}

/**
 * Higher-order component for permission-based rendering
 * 
 * @example
 * ```tsx
 * const DeleteButton = withPermission('agents:delete', ({ agentId }) => {
 *   return <button onClick={() => deleteAgent(agentId)}>Delete</button>;
 * });
 * ```
 */
export function withPermission<P extends object>(
  requiredPermission: PermissionAction,
  Component: React.ComponentType<P>
): React.FC<P> {
  return function PermissionWrapper(props: P) {
    const { can, isLoading } = useRBAC();
    
    if (isLoading) return null;
    if (!can(requiredPermission)) return null;
    
    return <Component {...props} />;
  };
}

/**
 * Higher-order component for role-based rendering
 * 
 * @example
 * ```tsx
 * const AdminPanel = withAtLeastRole('admin', () => {
 *   return <div>Admin-only content</div>;
 * });
 * ```
 */
export function withAtLeastRole<P extends object>(
  minimumRole: UserRole,
  Component: React.ComponentType<P>
): React.FC<P> {
  return function RoleWrapper(props: P) {
    const { isAtLeast, isLoading } = useRBAC();
    
    if (isLoading) return null;
    if (!isAtLeast(minimumRole)) return null;
    
    return <Component {...props} />;
  };
}

/**
 * Render children only if user has the required permission
 * 
 * @example
 * ```tsx
 * <PermissionGuard permission="agents:delete">
 *   <DeleteButton />
 * </PermissionGuard>
 * ```
 */
interface PermissionGuardProps {
  permission: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { can, isLoading } = useRBAC();
  
  if (isLoading) return null;
  if (!can(permission)) return fallback;
  
  return <>{children}</>;
}

/**
 * Render children only if user is at least the required role
 * 
 * @example
 * ```tsx
 * <RoleGuard minimumRole="admin">
 *   <AdminPanel />
 * </RoleGuard>
 * ```
 */
interface RoleGuardProps {
  minimumRole: UserRole;
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ minimumRole, children, fallback = null }: RoleGuardProps) {
  const { isAtLeast, isLoading } = useRBAC();
  
  if (isLoading) return null;
  if (!isAtLeast(minimumRole)) return fallback;
  
  return <>{children}</>;
}
