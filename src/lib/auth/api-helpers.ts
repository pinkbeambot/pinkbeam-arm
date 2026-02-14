import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  getTenantContextFromHeaders, 
  setTenantContext, 
  type TenantContext 
} from './tenant-context';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Type for Supabase client
type TypedSupabaseClient = SupabaseClient<Record<string, unknown>>;

/**
 * Extended request type with tenant context
 */
export interface AuthenticatedRequest extends NextRequest {
  tenantContext: TenantContext;
}

/**
 * Handler type for authenticated routes
 */
type AuthenticatedHandler = (
  request: AuthenticatedRequest,
  context: TenantContext
) => Promise<NextResponse> | NextResponse;

/**
 * Create a Supabase client for an authenticated request
 */
export function createAuthClient(authToken?: string): TypedSupabaseClient {
  if (authToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Extract bearer token from authorization header
 */
export function extractBearerToken(request: NextRequest): string | undefined {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return undefined;
  }
  return authHeader.split(' ')[1];
}

/**
 * Higher-order function to wrap API route handlers with authentication
 * 
 * Usage:
 * ```typescript
 * export const GET = withAuth(async (request, context) => {
 *   const supabase = createAuthClient(extractBearerToken(request));
 *   await setTenantContext(supabase, context.tenantId);
 *   
 *   // Your route logic here
 *   return NextResponse.json({ data: [] });
 * });
 * ```
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    // Get tenant context from middleware headers
    const context = getTenantContextFromHeaders(request.headers);

    if (!context) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
          message: 'No tenant context found. Ensure you are authenticated.'
        },
        { status: 401 }
      );
    }

    // Cast request to authenticated type
    const authRequest = request as AuthenticatedRequest;
    authRequest.tenantContext = context;

    try {
      return await handler(authRequest, context);
    } catch (error) {
      console.error('API route error:', error);
      return NextResponse.json(
        { 
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Create a server client with tenant context pre-set
 * Convenience function for API routes
 */
export async function createServerClientWithAuth(
  request: AuthenticatedRequest
): Promise<{
  supabase: TypedSupabaseClient;
  context: TenantContext;
}> {
  const token = extractBearerToken(request);
  const supabase = createAuthClient(token);

  // Set tenant context for RLS
  await setTenantContext(supabase, request.tenantContext.tenantId);

  return { supabase, context: request.tenantContext };
}

/**
 * Error response helpers
 */
export const authErrors = {
  unauthorized: (message = 'Authentication required') => 
    NextResponse.json(
      { error: message, code: 'UNAUTHORIZED' },
      { status: 401 }
    ),
  
  forbidden: (message = 'Access denied') =>
    NextResponse.json(
      { error: message, code: 'FORBIDDEN' },
      { status: 403 }
    ),
  
  notFound: (message = 'Resource not found') =>
    NextResponse.json(
      { error: message, code: 'NOT_FOUND' },
      { status: 404 }
    ),
  
  validationError: (details: unknown) =>
    NextResponse.json(
      { error: 'Validation error', code: 'VALIDATION_ERROR', details },
      { status: 400 }
    ),
  
  internalError: (message = 'Internal server error') =>
    NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    ),
};

/**
 * Success response helper
 */
export function successResponse<T>(
  data: T, 
  meta?: Record<string, unknown>,
  status: number = 200
) {
  const response: Record<string, unknown> = { data };
  if (meta) {
    response.meta = meta;
  }
  return NextResponse.json(response, { status });
}

/**
 * Paginated response helper
 */
export function paginatedResponse<T>(
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  },
  meta?: Record<string, unknown>
) {
  const response: Record<string, unknown> = {
    data,
    pagination,
  };
  if (meta) {
    response.meta = meta;
  }
  return NextResponse.json(response);
}
