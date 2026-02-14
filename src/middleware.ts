import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimitMiddleware, addRateLimitHeaders } from '@/lib/middleware/rate-limit';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public API routes that don't require authentication or rate limiting
const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/webhooks',
  '/api/health',
];

// Routes excluded from rate limiting (but still require auth)
const RATE_LIMIT_EXCLUDED_ROUTES = [
  '/api/health',
];

/**
 * Check if a route should skip rate limiting
 */
function isRateLimitExcluded(pathname: string): boolean {
  return RATE_LIMIT_EXCLUDED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Next.js Middleware for Authentication, Tenant Context, and Rate Limiting
 * 
 * This middleware:
 * - Validates JWT tokens via Supabase Auth
 * - Extracts tenant_id from JWT claims
 * - Handles token refresh automatically
 * - Returns 401 for invalid/missing tokens
 * - Applies per-tenant rate limiting (100 req/min free, 1000 req/min pro)
 * - Returns 429 with Retry-After header when limit exceeded
 * - Applies to all /api/* routes except public ones
 * - Sets tenant context headers for downstream RLS
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Create a response to modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with cookie handling
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // If the cookie is updated, update the cookies for the request and response
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        // If the cookie is removed, update the cookies for the request and response
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  // Get auth token from header (for API requests) or session (for SSR)
  const authHeader = request.headers.get('authorization');
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  try {
    // Validate the session/token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError.message);
      return NextResponse.json(
        { error: 'Invalid session', code: 'INVALID_SESSION' },
        { status: 401 }
      );
    }

    // If no session from cookies and no bearer token, check for token validity
    let user = session?.user;
    
    if (!user && token) {
      // Validate the bearer token
      const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
      
      if (tokenError || !tokenUser) {
        console.error('Token validation error:', tokenError?.message);
        return NextResponse.json(
          { error: 'Invalid or expired token', code: 'INVALID_TOKEN' },
          { status: 401 }
        );
      }
      
      user = tokenUser;
    }

    // If still no user, return 401
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Get user's tenant_id from JWT claims or user metadata
    // The tenant_id should be stored in user metadata during signup/onboarding
    const tenantId = user.user_metadata?.tenant_id || 
                     user.app_metadata?.tenant_id ||
                     (await getTenantIdFromUser(supabase, user.id));

    if (!tenantId) {
      console.error('No tenant_id found for user:', user.id);
      return NextResponse.json(
        { error: 'Tenant context not found', code: 'TENANT_NOT_FOUND' },
        { status: 403 }
      );
    }

    // Set tenant context headers for downstream API routes
    // These headers can be used by API routes to set RLS context
    response.headers.set('x-tenant-id', tenantId);
    response.headers.set('x-user-id', user.id);
    
    // Also set in request headers so API routes can access it
    request.headers.set('x-tenant-id', tenantId);
    request.headers.set('x-user-id', user.id);

    // Apply rate limiting (unless excluded)
    if (!isRateLimitExcluded(pathname)) {
      const rateLimitResponse = await rateLimitMiddleware(request, tenantId);
      
      if (rateLimitResponse) {
        // Rate limit exceeded - return the 429 response
        return rateLimitResponse;
      }
      
      // Add rate limit headers to the response
      response = await addRateLimitHeaders(response, tenantId);
    }

    // If there's a refreshed session, the cookies will be updated via the cookie callbacks
    return response;

  } catch (error) {
    console.error('Middleware error:', error);
    return NextResponse.json(
      { error: 'Internal authentication error', code: 'AUTH_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get tenant_id from users table
 * Fallback when tenant_id is not in JWT claims
 */
async function getTenantIdFromUser(
  supabase: ReturnType<typeof createServerClient>,
  authId: string
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', authId)
      .single();

    if (error || !data) {
      console.error('Error fetching user tenant:', error?.message);
      return null;
    }

    return data.tenant_id;
  } catch (err) {
    console.error('Exception fetching user tenant:', err);
    return null;
  }
}

/**
 * Middleware configuration
 * Match all API routes except public ones
 */
export const config = {
  matcher: [
    /*
     * Match all API routes:
     * - /api/:path*
     * Exclude:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/api/:path*',
  ],
};
