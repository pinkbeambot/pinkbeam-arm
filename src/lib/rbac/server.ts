/**
 * Server-side RBAC Middleware
 * 
 * Higher-order functions and utilities for enforcing RBAC in API routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { 
  getTenantContextFromHeaders, 
  type TenantContext 
} from '@/lib/auth/tenant-context';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { 
  UserRole, 
  PermissionAction, 
  UserWithRole,
  ROLE_PERMISSIONS 
} from './types';
import { 
  requirePermission, 
  requireAnyPermission, 
  requireAtLeastRole,
  PermissionChecker 
} from './permissions';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Extended auth context with user role
 */
export interface RBACContext extends TenantContext {
  user: UserWithRole;
  permissionChecker: PermissionChecker;
}

/**
 * Authenticated request with RBAC context
 */
export interface RBACRequest extends NextRequest {
  rbacContext: RBACContext;
}

/**
 * Handler type for RBAC-protected routes
 */
type RBACHandler = (
  request: RBACRequest,
  context: RBACContext
) => Promise<NextResponse> | NextResponse;

/**
 * User role data from database
 */
interface UserRoleData {
  id: string;
  email: string;
  role: string;
  tenant_id: string;
  name: string | null;
}

/**
 * Get user role from the database
 */
export async function getUserRole(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string
): Promise<UserWithRole | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, role, tenant_id, name')
    .eq('auth_id', userId)
    .single();

  if (error || !data) {
    console.error('Failed to fetch user role:', error);
    return null;
  }

  const userData = data as unknown as UserRoleData;

  return {
    id: userData.id,
    email: userData.email,
    role: userData.role as UserRole,
    tenantId: userData.tenant_id,
    name: userData.name || undefined,
  };
}

/**
 * Extract bearer token from request
 */
function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

/**
 * Get user role from request by validating token and fetching from DB
 */
export async function getUserRoleFromRequest(
  request: NextRequest
): Promise<{ user: UserWithRole | null; error?: string; status?: number }> {
  try {
    // Get tenant context from headers (set by middleware)
    const tenantContext = getTenantContextFromHeaders(request.headers);

    // Get auth token
    const token = extractBearerToken(request);
    if (!token) {
      return { user: null, error: 'Missing authorization header', status: 401 };
    }

    // Create auth client
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Validate token
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !authUser) {
      return { user: null, error: 'Invalid or expired token', status: 401 };
    }

    // Get user role from database using service role (bypasses RLS)
    const serviceClient = createServiceRoleClient();
    const userData = await getUserRole(serviceClient, authUser.id);

    if (!userData) {
      return { user: null, error: 'User not found', status: 403 };
    }

    // Verify user belongs to the tenant in context
    if (userData.tenantId !== tenantContext.tenantId) {
      return { user: null, error: 'User does not belong to this tenant', status: 403 };
    }

    return { user: userData };
  } catch (error) {
    console.error('Error getting user role from request:', error);
    return { user: null, error: 'Internal server error', status: 500 };
  }
}

/**
 * Create a Supabase client with RBAC context
 */
export function createRBACClient(): ReturnType<typeof createServiceRoleClient> {
  return createServiceRoleClient();
}

/**
 * Higher-order function that wraps a handler with RBAC check
 * Requires a specific permission
 * 
 * @example
 * ```typescript
 * export const POST = withPermission('agents:create', async (request, context) => {
 *   // Only users with 'agents:create' permission can access
 * });
 * ```
 */
export function withPermission(
  requiredPermission: PermissionAction,
  handler: RBACHandler
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error, status } = await getUserRoleFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const guard = requirePermission(user.role, requiredPermission);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    // Extend request with RBAC context
    const rbacRequest = request as RBACRequest;
    const tenantContext = getTenantContextFromHeaders(request.headers);
    rbacRequest.rbacContext = {
      ...tenantContext,
      user,
      permissionChecker: new PermissionChecker(user.role),
    };

    return handler(rbacRequest, rbacRequest.rbacContext);
  };
}

/**
 * Higher-order function that requires any of the specified permissions
 * 
 * @example
 * ```typescript
 * export const POST = withAnyPermission(
 *   ['agents:create', 'agents:update'], 
 *   async (request, context) => { ... }
 * );
 * ```
 */
export function withAnyPermission(
  permissions: PermissionAction[],
  handler: RBACHandler
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error, status } = await getUserRoleFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const guard = requireAnyPermission(user.role, permissions);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    const rbacRequest = request as RBACRequest;
    const tenantContext = getTenantContextFromHeaders(request.headers);
    rbacRequest.rbacContext = {
      ...tenantContext,
      user,
      permissionChecker: new PermissionChecker(user.role),
    };

    return handler(rbacRequest, rbacRequest.rbacContext);
  };
}

/**
 * Higher-order function that requires user to be at least a specific role
 * 
 * @example
 * ```typescript
 * export const POST = withAtLeastRole('admin', async (request, context) => {
 *   // Only admins and owners can access
 * });
 * ```
 */
export function withAtLeastRole(
  minimumRole: UserRole,
  handler: RBACHandler
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error, status } = await getUserRoleFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const guard = requireAtLeastRole(user.role, minimumRole);
    if (!guard.allowed) {
      return NextResponse.json({ error: guard.reason, code: 'FORBIDDEN' }, { status: 403 });
    }

    const rbacRequest = request as RBACRequest;
    const tenantContext = getTenantContextFromHeaders(request.headers);
    rbacRequest.rbacContext = {
      ...tenantContext,
      user,
      permissionChecker: new PermissionChecker(user.role),
    };

    return handler(rbacRequest, rbacRequest.rbacContext);
  };
}

/**
 * Higher-order function that wraps handler with RBAC context but no specific permission check
 * Useful when you need to check permissions dynamically within the handler
 * 
 * @example
 * ```typescript
 * export const GET = withRBAC(async (request, context) => {
 *   if (context.permissionChecker.can('agents:delete')) {
 *     // Show delete button in response
 *   }
 * });
 * ```
 */
export function withRBAC(handler: RBACHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { user, error, status } = await getUserRoleFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const rbacRequest = request as RBACRequest;
    const tenantContext = getTenantContextFromHeaders(request.headers);
    rbacRequest.rbacContext = {
      ...tenantContext,
      user,
      permissionChecker: new PermissionChecker(user.role),
    };

    return handler(rbacRequest, rbacRequest.rbacContext);
  };
}

/**
 * Helper to create a 403 Forbidden response
 */
export function forbiddenResponse(reason?: string): NextResponse {
  return NextResponse.json(
    { 
      error: reason || 'Access denied', 
      code: 'FORBIDDEN' 
    }, 
    { status: 403 }
  );
}

/**
 * Helper to create a 401 Unauthorized response
 */
export function unauthorizedResponse(reason?: string): NextResponse {
  return NextResponse.json(
    { 
      error: reason || 'Authentication required', 
      code: 'UNAUTHORIZED' 
    }, 
    { status: 401 }
  );
}
