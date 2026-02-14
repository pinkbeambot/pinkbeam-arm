import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { 
  getTenantContextFromHeaders, 
  setTenantContext, 
  extractBearerToken as extractToken,
  type TenantContext 
} from './tenant-context';
import { AuthError, authErrors as errorHelpers, handleAuthError, isZodError } from './errors';
import { z } from 'zod';

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
 * 
 * Error handling is automatic:
 * - AuthError instances are converted to proper JSON responses
 * - Zod validation errors return 400 with details
 * - Unexpected errors return 500
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get tenant context from middleware headers
      const context = getTenantContextFromHeaders(request.headers);

      // Cast request to authenticated type
      const authRequest = request as AuthenticatedRequest;
      authRequest.tenantContext = context;

      return await handler(authRequest, context);
    } catch (error) {
      console.error('API route error:', error);
      
      // Handle AuthError
      if (error instanceof AuthError) {
        return NextResponse.json(
          error.toAPIError(),
          { status: error.statusCode }
        );
      }
      
      // Handle Zod validation errors
      if (isZodError(error)) {
        return NextResponse.json(
          errorHelpers.validationError(error.issues).toAPIError(),
          { status: 400 }
        );
      }
      
      // Handle generic errors
      const message = error instanceof Error ? error.message : 'Internal server error';
      return NextResponse.json(
        errorHelpers.internalError(message).toAPIError(),
        { status: 500 }
      );
    }
  };
}

/**
 * Higher-order function that also validates request body with Zod schema
 * 
 * Usage:
 * ```typescript
 * const bodySchema = z.object({ name: z.string() });
 * 
 * export const POST = withAuthAndValidation(bodySchema, async (request, context, body) => {
 *   // body is typed and validated
 *   return successResponse({ created: true });
 * });
 * ```
 */
export function withAuthAndValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    request: AuthenticatedRequest,
    context: TenantContext,
    body: z.infer<T>
  ) => Promise<NextResponse> | NextResponse
) {
  return withAuth(async (request, context) => {
    // Parse and validate body
    const rawBody = await request.json();
    const result = schema.safeParse(rawBody);
    
    if (!result.success) {
      throw errorHelpers.validationError(result.error.issues);
    }
    
    return handler(request, context, result.data);
  });
}

/**
 * Higher-order function that validates query parameters with Zod schema
 * 
 * Usage:
 * ```typescript
 * const querySchema = z.object({ page: z.coerce.number().default(1) });
 * 
 * export const GET = withAuthAndQueryValidation(querySchema, async (request, context, query) => {
 *   // query is typed and validated
 *   return successResponse({ page: query.page });
 * });
 * ```
 */
export function withAuthAndQueryValidation<T extends z.ZodTypeAny>(
  schema: T,
  handler: (
    request: AuthenticatedRequest,
    context: TenantContext,
    query: z.infer<T>
  ) => Promise<NextResponse> | NextResponse
) {
  return withAuth(async (request, context) => {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawQuery: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      rawQuery[key] = value;
    });
    
    // Validate query parameters
    const result = schema.safeParse(rawQuery);
    
    if (!result.success) {
      throw errorHelpers.validationError(result.error.issues);
    }
    
    return handler(request, context, result.data);
  });
}

/**
 * Create a server client with tenant context pre-set
 * Convenience function for API routes
 * 
 * @throws AuthError if client creation or context setting fails
 */
export async function createServerClientWithAuth(
  request: AuthenticatedRequest
): Promise<{
  supabase: TypedSupabaseClient;
  context: TenantContext;
}> {
  const token = extractToken(request);
  const supabase = createAuthClient(token);

  // Set tenant context for RLS
  await setTenantContext(supabase, request.tenantContext.tenantId);

  return { supabase, context: request.tenantContext };
}

/**
 * Extract bearer token from authorization header
 * Re-export from tenant-context for convenience
 */
export { extractToken as extractBearerToken };

/**
 * Error response helpers for backward compatibility
 * @deprecated Use AuthError class and errorHelpers factory instead
 */
export const legacyAuthErrors = {
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

/**
 * Created response helper (201)
 */
export function createdResponse<T>(data: T, meta?: Record<string, unknown>) {
  return successResponse(data, meta, 201);
}

/**
 * No content response helper (204)
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Build pagination from request query parameters
 * Validates and sanitizes page/limit values
 */
export function getPaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {}
): { page: number; limit: number; offset: number } {
  const maxLimit = defaults.maxLimit ?? 100;
  const defaultLimit = Math.min(defaults.limit ?? 20, maxLimit);
  const defaultPage = defaults.page ?? 1;

  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');

  const page = Math.max(1, parseInt(pageParam || String(defaultPage), 10) || defaultPage);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(limitParam || String(defaultLimit), 10) || defaultLimit)
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}
