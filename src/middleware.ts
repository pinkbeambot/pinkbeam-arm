import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimitMiddleware, addRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { csrfMiddleware } from '@/lib/middleware/csrf';
import { API_VERSION, isNonVersionedRoute } from '@/lib/api/versioning';

// Dev auth bypass - SERVER SIDE ONLY, development only
// NEVER set DEV_AUTH_BYPASS in production - build will fail
const DEV_AUTH_BYPASS = process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV === 'development';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth',
  '/api/webhooks',
  '/api/health',
];

// Public page routes
const PUBLIC_PAGE_ROUTES = [
  '/auth',
  '/login',
  '/signup',
  '/',
  '/about',
  '/pricing',
  '/contact',
  '/agents',
  '/terms',
  '/privacy',
  '/auth/callback',
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
 * Check if a page route is public
 */
function isPublicPageRoute(pathname: string): boolean {
  return PUBLIC_PAGE_ROUTES.some(route => 
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Next.js Middleware for Authentication, Tenant Context, and Rate Limiting
 * 
 * This middleware:
 * - Validates JWT tokens via Supabase Auth for API routes
 * - Redirects unauthenticated users to /login for protected page routes
 * - Extracts tenant_id from JWT claims
 * - Handles token refresh automatically
 * - Returns 401 for invalid/missing tokens on API routes
 * - Enforces CSRF protection (origin validation + double-submit cookie)
 * - Applies per-tenant rate limiting (100 req/min free, 1000 req/min pro)
 * - Returns 429 with Retry-After header when limit exceeded
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Normalize versioned API paths for route matching.
  // /api/v1/agents → /api/agents for PUBLIC_ROUTES, rate-limit checks, etc.
  const normalizedPathname = pathname.startsWith('/api/v1/')
    ? pathname.replace('/api/v1/', '/api/')
    : pathname;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images/') ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  ) {
    return NextResponse.next();
  }

  // Dev auth bypass — skip all auth checks for page routes
  if (DEV_AUTH_BYPASS) {
    // For API routes, inject a mock tenant context
    if (pathname.startsWith('/api/')) {
      const isPublicRoute = PUBLIC_ROUTES.some(route => normalizedPathname.startsWith(route));
      if (isPublicRoute) return NextResponse.next();

      const response = NextResponse.next({ request: { headers: request.headers } });
      response.headers.set('x-tenant-id', 'dev-tenant-000');
      response.headers.set('x-user-id', 'dev-user-000');
      request.headers.set('x-tenant-id', 'dev-tenant-000');
      request.headers.set('x-user-id', 'dev-user-000');
      return response;
    }
    // Let all page routes through (no redirect to login)
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

  // Get session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error('Session error:', sessionError.message);
  }

  // Handle API routes (match both /api/ and /api/v1/)
  if (pathname.startsWith('/api/')) {
    // Check if this is a public API route (using normalized path)
    const isPublicRoute = PUBLIC_ROUTES.some(route => normalizedPathname.startsWith(route));
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // API routes require authentication
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // CSRF validation (origin + double-submit cookie)
    const csrf = csrfMiddleware(request);
    if (csrf.errorResponse) {
      return csrf.errorResponse;
    }

    // Get user's tenant_id from session
    const user = session.user;
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
    response.headers.set('x-tenant-id', tenantId);
    response.headers.set('x-user-id', user.id);
    request.headers.set('x-tenant-id', tenantId);
    request.headers.set('x-user-id', user.id);

    // Apply rate limiting (unless excluded, using normalized path)
    if (!isRateLimitExcluded(normalizedPathname)) {
      const rateLimitResponse = await rateLimitMiddleware(request, tenantId);

      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      response = await addRateLimitHeaders(response, tenantId);
    }

    // API version headers
    response.headers.set('X-API-Version', API_VERSION);
    if (!pathname.startsWith(`/api/${API_VERSION}/`) && !isNonVersionedRoute(normalizedPathname)) {
      response.headers.set('X-Deprecated', 'Use /api/v1/ prefix. Unversioned paths will be removed in a future release.');
    }

    // Attach CSRF cookie to the response
    return csrf.attachCookie(response);
  }

  // Handle page routes - redirect unauthenticated users from /portal/* to /auth
  if (pathname.startsWith('/portal/') || pathname === '/portal') {
    if (!session) {
      const authUrl = new URL('/auth', request.url);
      authUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(authUrl);
    }
  }

  // Redirect authenticated users away from /auth, /login, and /signup
  if (pathname === '/auth' || pathname.startsWith('/auth/') ||
      pathname === '/login' || pathname.startsWith('/login/') ||
      pathname === '/signup' || pathname.startsWith('/signup/')) {
    if (session) {
      const redirectTo = request.nextUrl.searchParams.get('redirect') || '/portal';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }
  }

  // Set CSRF cookie on page responses so it's available before the first API call
  const pageCsrf = csrfMiddleware(request);
  return pageCsrf.attachCookie(response);
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
 * Match all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
