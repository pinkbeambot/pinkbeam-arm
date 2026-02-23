/**
 * Shared API Route Authentication & Tenant Resolution
 *
 * Centralizes the auth + tenant lookup boilerplate used by all API routes.
 * Returns a service role Supabase client (bypasses RLS) along with the
 * authenticated tenant and user IDs for explicit tenant-scoped queries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@supabase/supabase-js';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { UserRole } from '@/lib/rbac';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export interface AuthContext {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  supabase: ReturnType<typeof createServiceRoleClient>;
}

/**
 * Authenticate an API request and resolve the tenant.
 *
 * 1. Validates the Bearer token via an anon client
 * 2. Looks up the user's tenant from the `users` table
 * 3. Returns a service role client + tenantId for data queries
 *
 * Returns NextResponse on auth failure (401/403) so the caller can
 * early-return it directly.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthContext | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  const authClient = createServerClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userProfile, error: profileError } = await authClient
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !userProfile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 403 });
  }

  return {
    tenantId: userProfile.tenant_id,
    userId: user.id,
    userRole: userProfile.role as UserRole,
    supabase: createServiceRoleClient(),
  };
}

/**
 * Type guard: check if authenticateRequest returned an error response.
 */
export function isErrorResponse(
  result: AuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
