/**
 * Rate Limiting Middleware
 * 
 * Applies per-tenant rate limiting to API routes.
 * Integrates with the existing Next.js middleware.
 * 
 * Usage:
 * - Import and use in middleware.ts for API routes
 * - Returns 429 with Retry-After header when limit exceeded
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimitService, RateLimitTier, RATE_LIMITS } from '@/lib/rate-limit';
import { getTenantTierFromDB, clearTenantTierCache as clearDBTierCache } from '@/lib/tenant-tier';

// Environment variable for default tier
const DEFAULT_TIER: RateLimitTier = 'free';

// In-memory cache for tenant tiers (used when DB is unavailable)
interface TierCacheEntry {
  tier: RateLimitTier;
  timestamp: number;
}

const tierCache = new Map<string, TierCacheEntry>();
const TIER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get tenant tier from database or cache
 */
async function getTenantTier(tenantId: string): Promise<RateLimitTier> {
  // Check environment variable at runtime (for testing)
  const useDbTier = process.env.USE_DB_TIER !== 'false';
  
  if (useDbTier) {
    return getTenantTierFromDB(tenantId);
  }

  // Fallback to local cache
  const cached = tierCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < TIER_CACHE_TTL) {
    return cached.tier;
  }

  // Check environment variable for pro tenants
  const proTenants = process.env.PRO_TENANT_IDS?.split(',') || [];
  const tier: RateLimitTier = proTenants.includes(tenantId) ? 'pro' : DEFAULT_TIER;
  
  // Cache the result
  tierCache.set(tenantId, { tier, timestamp: Date.now() });
  
  return tier;
}

/**
 * Clear tier cache for a tenant (useful when plan changes)
 */
export function clearTenantTierCache(tenantId?: string): void {
  if (tenantId) {
    tierCache.delete(tenantId);
    clearDBTierCache(tenantId);
  } else {
    tierCache.clear();
    clearDBTierCache();
  }
}

/**
 * Rate limiting middleware handler
 * 
 * @param request - Next.js request object
 * @param tenantId - Tenant ID from authentication
 * @returns NextResponse or null if allowed to proceed
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  tenantId: string
): Promise<NextResponse | null> {
  try {
    // Get tenant's rate limit tier
    const tier = await getTenantTier(tenantId);
    
    // Check rate limit
    const result = await rateLimitService.checkLimit(tenantId, tier);
    
    // If not allowed, return 429 response
    if (!result.allowed) {
      const headers = new Headers();
      headers.set('Retry-After', String(result.retryAfter || 60));
      headers.set('X-RateLimit-Limit', String(result.limit));
      headers.set('X-RateLimit-Remaining', '0');
      headers.set('X-RateLimit-Reset', String(result.resetTime));
      
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          message: `You have exceeded the ${result.limit} requests per minute limit for your ${tier} plan.`,
          retryAfter: result.retryAfter || 60,
        },
        { 
          status: 429,
          headers,
        }
      );
    }
    
    // Request is allowed - add rate limit headers to response
    // These will be passed through if the request continues
    request.headers.set('X-RateLimit-Limit', String(result.limit));
    request.headers.set('X-RateLimit-Remaining', String(result.remaining));
    request.headers.set('X-RateLimit-Reset', String(result.resetTime));
    request.headers.set('X-RateLimit-Tier', tier);
    
    return null; // Allow request to proceed
  } catch (error) {
    console.error('[RateLimitMiddleware] Error:', error);
    // Fail open - allow request on error to prevent blocking legitimate traffic
    return null;
  }
}

/**
 * Add rate limit headers to a successful response
 * 
 * @param response - NextResponse to modify
 * @param tenantId - Tenant ID
 * @returns Modified response with rate limit headers
 */
export async function addRateLimitHeaders(
  response: NextResponse,
  tenantId: string
): Promise<NextResponse> {
  try {
    const tier = await getTenantTier(tenantId);
    const status = await rateLimitService.getLimitStatus(tenantId, tier);
    
    response.headers.set('X-RateLimit-Limit', String(status.limit));
    response.headers.set('X-RateLimit-Remaining', String(status.remaining));
    response.headers.set('X-RateLimit-Reset', String(status.resetTime));
    response.headers.set('X-RateLimit-Tier', status.tier);
    
    return response;
  } catch (error) {
    // Silently fail - headers are optional
    return response;
  }
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 * 
 * @param handler - API route handler
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>
): (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params: Record<string, string> }): Promise<NextResponse> => {
    // Get tenant ID from headers (set by auth middleware)
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required', code: 'TENANT_REQUIRED' },
        { status: 400 }
      );
    }
    
    // Check rate limit
    const rateLimitResponse = await rateLimitMiddleware(request, tenantId);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }
    
    // Execute handler
    const response = await handler(request, context);
    
    // Add rate limit headers to successful response
    return addRateLimitHeaders(response, tenantId);
  };
}

// Export configuration
export { RATE_LIMITS };
export type { RateLimitTier };
