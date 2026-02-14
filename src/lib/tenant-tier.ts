/**
 * Tenant Tier Service
 * 
 * Fetches and caches tenant subscription tiers from the database.
 * Used by rate limiting to determine request limits.
 */

import { createClient } from '@supabase/supabase-js';
import { RateLimitTier } from '@/lib/rate-limit';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// In-memory cache for tenant tiers
interface TierCacheEntry {
  tier: RateLimitTier;
  timestamp: number;
}

const tierCache = new Map<string, TierCacheEntry>();
const TIER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default tier for new or unknown tenants
const DEFAULT_TIER: RateLimitTier = 'free';

/**
 * Get the Supabase admin client for database operations
 */
function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Get tenant tier from database
 * Uses the tenants.plan field to determine tier
 */
export async function getTenantTierFromDB(tenantId: string): Promise<RateLimitTier> {
  // Check cache first
  const cached = tierCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < TIER_CACHE_TTL) {
    return cached.tier;
  }

  try {
    const supabase = getAdminClient();
    
    const { data, error } = await supabase
      .from('tenants')
      .select('plan, limits')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      console.error(`[TenantTier] Error fetching tier for ${tenantId}:`, error?.message);
      return DEFAULT_TIER;
    }

    // Map plan to rate limit tier
    // Plans: starter, pro, enterprise
    let tier: RateLimitTier;
    
    switch (data.plan) {
      case 'pro':
      case 'enterprise':
        tier = 'pro';
        break;
      case 'starter':
      case 'free':
      default:
        tier = 'free';
        break;
    }

    // Check if limits override is set in config
    if (data.limits?.rate_limit_tier) {
      tier = data.limits.rate_limit_tier as RateLimitTier;
    }

    // Cache the result
    tierCache.set(tenantId, { tier, timestamp: Date.now() });

    return tier;
  } catch (error) {
    console.error(`[TenantTier] Exception fetching tier for ${tenantId}:`, error);
    return DEFAULT_TIER;
  }
}

/**
 * Clear tier cache for a tenant
 * Call this when a tenant's plan changes
 */
export function clearTenantTierCache(tenantId?: string): void {
  if (tenantId) {
    tierCache.delete(tenantId);
    console.log(`[TenantTier] Cache cleared for tenant ${tenantId}`);
  } else {
    tierCache.clear();
    console.log('[TenantTier] All tier cache cleared');
  }
}

/**
 * Get all cached tiers (useful for debugging)
 */
export function getCachedTiers(): Record<string, RateLimitTier> {
  const result: Record<string, RateLimitTier> = {};
  for (const [tenantId, entry] of tierCache.entries()) {
    result[tenantId] = entry.tier;
  }
  return result;
}

/**
 * Set tenant tier manually (useful for testing or admin overrides)
 */
export function setTenantTier(tenantId: string, tier: RateLimitTier): void {
  tierCache.set(tenantId, { tier, timestamp: Date.now() });
}

/**
 * Update tenant tier in database and clear cache
 */
export async function updateTenantTier(
  tenantId: string, 
  tier: RateLimitTier
): Promise<boolean> {
  try {
    const supabase = getAdminClient();
    
    // Map tier to plan
    const plan = tier === 'pro' ? 'pro' : 'starter';
    
    const { error } = await supabase
      .from('tenants')
      .update({ 
        plan,
        limits: {
          rate_limit_tier: tier,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      console.error(`[TenantTier] Error updating tier for ${tenantId}:`, error.message);
      return false;
    }

    // Clear cache to force refresh
    clearTenantTierCache(tenantId);

    return true;
  } catch (error) {
    console.error(`[TenantTier] Exception updating tier for ${tenantId}:`, error);
    return false;
  }
}
