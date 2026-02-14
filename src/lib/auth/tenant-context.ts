import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Type for Supabase client
type TypedSupabaseClient = SupabaseClient<Record<string, unknown>>;

/**
 * Tenant Context Types
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  authToken?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email?: string;
    tenantId: string;
  } | null;
  error: string | null;
  status: 200 | 401 | 403 | 500;
}

/**
 * Extract tenant context from request headers
 * Set by the middleware for downstream use
 */
export function getTenantContextFromHeaders(headers: Headers): TenantContext | null {
  const tenantId = headers.get('x-tenant-id');
  const userId = headers.get('x-user-id');

  if (!tenantId || !userId) {
    return null;
  }

  return {
    tenantId,
    userId,
  };
}

/**
 * Set tenant context for RLS in Supabase
 * This should be called after creating a server client
 */
export async function setTenantContext(
  supabase: TypedSupabaseClient,
  tenantId: string
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)('set_tenant_context', { 
    tenant_id: tenantId 
  });

  if (error) {
    console.error('Failed to set tenant context:', error);
    throw new Error(`Failed to set tenant context: ${error.message}`);
  }
}

/**
 * Create a server-side Supabase client with tenant context set
 * For use in API routes that need RLS-enforced access
 */
export async function createServerClientWithContext(
  authToken?: string,
  tenantId?: string
): Promise<{ client: TypedSupabaseClient; context: TenantContext | null }> {
  // Create base client
  const client = authToken 
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      })
    : createClient(supabaseUrl, supabaseAnonKey);

  // If tenantId is provided, set the context
  if (tenantId) {
    await setTenantContext(client, tenantId);
    
    // Get user from token if available
    if (authToken) {
      const { data: { user } } = await client.auth.getUser(authToken);
      if (user) {
        return {
          client,
          context: {
            tenantId,
            userId: user.id,
            authToken,
          },
        };
      }
    }
  }

  return { client, context: null };
}

/**
 * Create a Supabase client from Next.js cookies (for SSR/app router)
 */
export async function createClientFromCookies() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Validate authentication and extract tenant context
 * For use in API route handlers
 */
export async function validateAuthAndGetContext(
  request: Request
): Promise<AuthResult> {
  try {
    // First check for middleware-set headers
    const context = getTenantContextFromHeaders(request.headers);
    
    if (context) {
      // Get user email from auth if available
      const authHeader = request.headers.get('authorization');
      let email: string | undefined;
      
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
        
        const { data: { user } } = await supabase.auth.getUser(token);
        email = user?.email;
      }

      return {
        user: {
          id: context.userId,
          email,
          tenantId: context.tenantId,
        },
        error: null,
        status: 200,
      };
    }

    // Fallback: validate token directly
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        user: null,
        error: 'Missing or invalid authorization header',
        status: 401,
      };
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Validate token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        user: null,
        error: 'Invalid or expired token',
        status: 401,
      };
    }

    // Get tenant_id from user metadata or database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tenantId = (user.user_metadata as any)?.tenant_id || (user.app_metadata as any)?.tenant_id;
    
    if (!tenantId) {
      // Fetch from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (profileError || !(userProfile as any)?.tenant_id) {
        return {
          user: null,
          error: 'Tenant not found',
          status: 403,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenantId = (userProfile as any).tenant_id;
    }

    // Set tenant context
    await setTenantContext(supabase, tenantId);

    return {
      user: {
        id: user.id,
        email: user.email,
        tenantId,
      },
      error: null,
      status: 200,
    };

  } catch (error) {
    console.error('Auth validation error:', error);
    return {
      user: null,
      error: 'Internal authentication error',
      status: 500,
    };
  }
}

/**
 * Service role client for admin operations
 * Bypasses RLS - use with extreme caution
 */
export function createServiceClient(): TypedSupabaseClient {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Helper to get tenant context from cookies (for SSR)
 */
export async function getTenantContextFromSession(): Promise<TenantContext | null> {
  try {
    const supabase = await createClientFromCookies();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session?.user) {
      return null;
    }

    const user = session.user;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let tenantId = (user.user_metadata as any)?.tenant_id || (user.app_metadata as any)?.tenant_id;

    if (!tenantId) {
      // Fetch from database
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tenantId = (userProfile as any)?.tenant_id;
    }

    if (!tenantId) {
      return null;
    }

    return {
      tenantId,
      userId: user.id,
    };
  } catch (error) {
    console.error('Error getting tenant context from session:', error);
    return null;
  }
}

/**
 * Refresh token if needed and return new session
 */
export async function refreshSession(
  supabase: TypedSupabaseClient
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession();

    if (error || !session) {
      return { success: false, error: error?.message || 'Failed to refresh session' };
    }

    return { success: true };
  } catch (error) {
    console.error('Session refresh error:', error);
    return { success: false, error: 'Exception during session refresh' };
  }
}

/**
 * Check if user has required capability
 * For capability-based authorization
 */
export async function userHasCapability(
  supabase: TypedSupabaseClient,
  userId: string,
  capability: string
): Promise<boolean> {
  try {
    // Get the user's agent record to check capabilities
    const { data: agent, error } = await supabase
      .from('agents')
      .select('capabilities')
      .eq('auth_id', userId)
      .single();

    if (error || !agent) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((agent as any).capabilities as string[])?.includes(capability) || false;
  } catch (error) {
    console.error('Capability check error:', error);
    return false;
  }
}

/**
 * Middleware handler for API routes
 * Wraps route handlers with auth validation
 */
export function withAuth(
  handler: (request: Request, context: TenantContext) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const authResult = await validateAuthAndGetContext(request);

    if (authResult.error || !authResult.user) {
      return new Response(
        JSON.stringify({ error: authResult.error, code: 'UNAUTHORIZED' }),
        { status: authResult.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const tenantContext: TenantContext = {
      tenantId: authResult.user.tenantId,
      userId: authResult.user.id,
    };

    return handler(request, tenantContext);
  };
}
