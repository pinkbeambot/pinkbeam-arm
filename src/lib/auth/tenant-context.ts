import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { tenantContextSchema, authorizationHeaderSchema } from '@/lib/validation';
import { AuthError, authErrors } from './errors';
import { z } from 'zod';
import type { TypedDatabase } from '@/lib/database';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Type for Supabase client
type TypedSupabaseClient = SupabaseClient<TypedDatabase>;

// Type for user metadata from Supabase Auth
interface UserMetadataWithTenant {
  tenant_id?: string;
  [key: string]: unknown;
}

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
 * 
 * @throws AuthError if headers are missing or invalid
 */
export function getTenantContextFromHeaders(headers: Headers): TenantContext {
  const tenantId = headers.get('x-tenant-id');
  const userId = headers.get('x-user-id');

  if (!tenantId || !userId) {
    throw authErrors.unauthorized('No tenant context found. Ensure you are authenticated.');
  }

  // Validate with Zod
  const result = tenantContextSchema.safeParse({ tenantId, userId });
  
  if (!result.success) {
    throw authErrors.validationError(result.error.issues);
  }

  return result.data;
}

/**
 * Safely extract tenant context from request headers
 * Returns null instead of throwing
 */
export function getTenantContextFromHeadersSafe(headers: Headers): TenantContext | null {
  try {
    return getTenantContextFromHeaders(headers);
  } catch {
    return null;
  }
}

/**
 * Set tenant context for RLS in Supabase
 * This should be called after creating a server client
 * 
 * @throws AuthError if setting context fails
 */
export async function setTenantContext(
  supabase: TypedSupabaseClient,
  tenantId: string
): Promise<void> {
  // Validate tenantId format
  const uuidSchema = z.string().uuid();
  const validation = uuidSchema.safeParse(tenantId);
  
  if (!validation.success) {
    throw authErrors.validationError([{
      path: ['tenantId'],
      message: 'Invalid tenant ID format',
      code: 'invalid_string',
    }]);
  }

  const { error } = await supabase.rpc('set_tenant_context', {
    tenant_id: tenantId
  });

  if (error) {
    console.error('Failed to set tenant context:', error);
    throw new AuthError(
      `Failed to set tenant context: ${error.message}`,
      'INTERNAL_ERROR',
      500
    );
  }
}

/**
 * Create a server-side Supabase client with tenant context set
 * For use in API routes that need RLS-enforced access
 * 
 * @throws AuthError if client creation or context setting fails
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
 * Extract and validate bearer token from authorization header
 * 
 * @throws AuthError if header is missing or invalid
 */
export function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    throw authErrors.unauthorized('Missing authorization header');
  }

  // Validate header format with Zod
  const result = authorizationHeaderSchema.safeParse(authHeader);
  
  if (!result.success) {
    throw authErrors.validationError(result.error.issues);
  }

  return authHeader.split(' ')[1];
}

/**
 * Safely extract bearer token
 * Returns null instead of throwing
 */
export function extractBearerTokenSafe(request: Request): string | null {
  try {
    return extractBearerToken(request);
  } catch {
    return null;
  }
}

/**
 * Validate authentication and extract tenant context
 * For use in API route handlers
 * 
 * @throws AuthError if validation fails
 */
export async function validateAuthAndGetContext(
  request: Request
): Promise<AuthResult> {
  try {
    // First check for middleware-set headers
    const context = getTenantContextFromHeadersSafe(request.headers);
    
    if (context) {
      // Get user email from auth if available
      const token = extractBearerTokenSafe(request);
      let email: string | undefined;
      
      if (token) {
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
    const token = extractBearerToken(request);
    
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
      throw authErrors.invalidToken(authError?.message || 'Invalid or expired token');
    }

    // Get tenant_id from user metadata or database
    const metadataTenantId = (user.user_metadata as UserMetadataWithTenant)?.tenant_id || (user.app_metadata as UserMetadataWithTenant)?.tenant_id;

    let tenantId: string;
    if (metadataTenantId) {
      tenantId = metadataTenantId;
    } else {
      // Fetch from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      if (profileError || !userProfile?.tenant_id) {
        throw authErrors.tenantNotFound();
      }

      tenantId = userProfile.tenant_id;
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
    if (error instanceof AuthError) {
      return {
        user: null,
        error: error.message,
        status: error.statusCode as 401 | 403 | 500,
      };
    }
    
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
    let tenantId = (user.user_metadata as UserMetadataWithTenant)?.tenant_id || (user.app_metadata as UserMetadataWithTenant)?.tenant_id;

    if (!tenantId) {
      // Fetch from database
      const { data: userProfile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      tenantId = userProfile?.tenant_id;
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

    return agent.capabilities?.includes(capability) || false;
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
    try {
      const context = getTenantContextFromHeaders(request.headers);
      return handler(request, context);
    } catch (error) {
      if (error instanceof AuthError) {
        return new Response(
          JSON.stringify(error.toAPIError()),
          { 
            status: error.statusCode, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const internalError = authErrors.internalError();
      return new Response(
        JSON.stringify(internalError.toAPIError()),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
  };
}
