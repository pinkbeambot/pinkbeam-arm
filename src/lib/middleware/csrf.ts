/**
 * CSRF Protection Middleware
 *
 * Implements two layers of defense against Cross-Site Request Forgery:
 *
 * 1. **Origin validation** — rejects state-changing requests (POST, PATCH,
 *    PUT, DELETE) whose Origin or Referer header doesn't match the app's
 *    own URL. This blocks cross-origin form submissions and simple XHR.
 *
 * 2. **Double-submit cookie** — generates a random CSRF token, sets it as
 *    a non-HttpOnly cookie (`csrf_token`), and requires clients to echo it
 *    back via the `x-csrf-token` header. Because a cross-origin attacker
 *    cannot read another site's cookies (Same-Origin Policy), they cannot
 *    forge the matching header.
 *
 * Together these two layers protect cookie-authenticated flows (Supabase SSR)
 * even if SameSite cookie attributes are relaxed.
 *
 * Usage: import and call from `middleware.ts` for all protected API routes.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Constants ───────────────────────────────────────────────────────────────

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32; // 32 bytes → 64 hex chars

/** HTTP methods that mutate state and need CSRF protection */
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** API routes exempt from CSRF checks (webhooks use their own auth) */
const CSRF_EXEMPT_ROUTES = [
  '/api/auth',
  '/api/webhooks',
  '/api/health',
];

// ── App origin (derived once at module load) ────────────────────────────────

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const APP_ORIGIN = new URL(APP_URL).origin;

// ── Token generation ────────────────────────────────────────────────────────

/**
 * Generate a cryptographically random hex token.
 * Uses Web Crypto API (available in Edge Runtime and Node 18+).
 */
function generateCsrfToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ── Validation helpers ──────────────────────────────────────────────────────

/**
 * Check whether the request's Origin (or Referer fallback) matches the app.
 * Returns `true` if origin is valid, `false` if it's a cross-origin mutation.
 */
function isOriginValid(request: NextRequest): boolean {
  const origin = request.headers.get('origin');

  if (origin) {
    return origin === APP_ORIGIN;
  }

  // Fall back to Referer header (some older browsers / privacy tools strip Origin)
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).origin === APP_ORIGIN;
    } catch {
      return false; // malformed referer
    }
  }

  // If neither header is present, allow the request.
  // Browsers always send Origin on cross-origin requests; its absence
  // indicates a same-origin request or a direct API call (e.g. curl).
  return true;
}

/**
 * Validate the double-submit CSRF token.
 * The cookie value must be present and match the request header value.
 */
function isTokenValid(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(cookieToken, headerToken);
}

/**
 * Constant-time string comparison.
 * Prevents timing side-channels when comparing tokens.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ── Middleware entry point ───────────────────────────────────────────────────

export interface CsrfResult {
  /** If non-null, return this response immediately (request blocked). */
  errorResponse: NextResponse | null;
  /** Call this after building the final success response to attach the CSRF cookie. */
  attachCookie: (response: NextResponse) => NextResponse;
}

/**
 * Run CSRF validation on the request.
 *
 * Call this from the main middleware for every API route that is NOT exempt.
 * For GET/HEAD/OPTIONS requests, it only ensures a CSRF cookie exists.
 * For state-changing methods, it validates origin + double-submit token.
 */
export function csrfMiddleware(request: NextRequest): CsrfResult {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // ── Exempt routes bypass all CSRF logic ─────────────────────────────────
  const isExempt = CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route));

  if (isExempt) {
    return {
      errorResponse: null,
      attachCookie: (r) => r,
    };
  }

  // ── Ensure a CSRF cookie exists (rotate if missing) ─────────────────────
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const token = existingToken || generateCsrfToken();
  const needsCookie = !existingToken;

  // Helper to set the cookie on any outgoing response
  const attachCookie = (response: NextResponse): NextResponse => {
    if (needsCookie) {
      response.cookies.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false,       // JS must be able to read it
        secure: APP_ORIGIN.startsWith('https'),
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24,  // 24 hours
      });
    }
    return response;
  };

  // ── Read-only methods only need the cookie, no validation ───────────────
  if (!STATE_CHANGING_METHODS.has(method)) {
    return { errorResponse: null, attachCookie };
  }

  // ── Layer 1: Origin validation ──────────────────────────────────────────
  if (!isOriginValid(request)) {
    return {
      errorResponse: NextResponse.json(
        {
          error: 'CSRF validation failed',
          code: 'CSRF_ORIGIN_MISMATCH',
          message: 'Request origin does not match the application.',
        },
        { status: 403 }
      ),
      attachCookie: (r) => r,
    };
  }

  // ── Layer 2: Double-submit token validation ─────────────────────────────
  if (!isTokenValid(request)) {
    return {
      errorResponse: NextResponse.json(
        {
          error: 'CSRF validation failed',
          code: 'CSRF_TOKEN_INVALID',
          message: 'Missing or invalid CSRF token. Include the csrf_token cookie value in the x-csrf-token header.',
        },
        { status: 403 }
      ),
      attachCookie: (r) => r,
    };
  }

  return { errorResponse: null, attachCookie };
}
