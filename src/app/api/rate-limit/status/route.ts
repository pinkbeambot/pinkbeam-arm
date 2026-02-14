/**
 * Rate Limit Status API
 * 
 * GET /api/rate-limit/status
 * 
 * Returns the current rate limit status for the authenticated tenant.
 * Useful for debugging and monitoring rate limit consumption.
 * 
 * Response:
 * {
 *   "tier": "free",
 *   "limit": 100,
 *   "remaining": 85,
 *   "resetTime": 1707868800,
 *   "window": 60
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimitService, RATE_LIMITS, RateLimitTier } from '@/lib/rate-limit';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * GET /api/rate-limit/status
 * Get current rate limit status for the authenticated tenant
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const token = authHeader.split(' ')[1];

    // Create Supabase client
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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's tenant
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('auth_id', user.id)
      .single();

    if (profileError || !userProfile?.tenant_id) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 403 }
      );
    }

    const tenantId = userProfile.tenant_id;

    // Get tenant plan to determine tier
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan, limits')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Determine tier from plan
    let tier: RateLimitTier = 'free';
    if (tenant.plan === 'pro' || tenant.plan === 'enterprise') {
      tier = 'pro';
    }
    if (tenant.limits?.rate_limit_tier) {
      tier = tenant.limits.rate_limit_tier as RateLimitTier;
    }

    // Get rate limit status
    const status = await rateLimitService.getLimitStatus(tenantId, tier);

    // Return status with headers
    const headers = new Headers();
    headers.set('X-RateLimit-Limit', String(status.limit));
    headers.set('X-RateLimit-Remaining', String(status.remaining));
    headers.set('X-RateLimit-Reset', String(status.resetTime));
    headers.set('X-RateLimit-Tier', status.tier);

    return NextResponse.json(
      {
        tier: status.tier,
        limit: status.limit,
        remaining: status.remaining,
        resetTime: status.resetTime,
        window: 60, // seconds
      },
      { headers }
    );
  } catch (error) {
    console.error('Error in rate limit status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
