/**
 * Tenant Tier Service
 * 
 * Fetches and caches tenant subscription tiers from the database.
 * Uses tenant_settings table for per-tenant rate limit configuration.
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
  requestsPerMinute: number;
  timestamp: number;
}

const tierCache = new Map<string, TierCacheEntry>();
const TIER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Default tier for new or unknown tenants
const DEFAULT_TIER: RateLimitTier = 'free';
const DEFAULT_REQUESTS_PER_MINUTE = 100;

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
 * Uses tenant_settings table for rate limit configuration
 * Falls back to tenants.plan if tenant_settings doesn't exist
 */
export async function getTenantTierFromDB(tenantId: string): Promise<RateLimitTier> {
  // Check cache first
  const cached = tierCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < TIER_CACHE_TTL) {
    return cached.tier;
  }

  try {
    const supabase = getAdminClient();
    
    // First try to get from tenant_settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('rate_limit_requests_per_minute, rate_limit_enabled')
      .eq('tenant_id', tenantId)
      .single();

    if (!settingsError && settings && settings.rate_limit_enabled) {
      // Determine tier based on requests per minute
      const requestsPerMinute = settings.rate_limit_requests_per_minute || DEFAULT_REQUESTS_PER_MINUTE;
      const tier: RateLimitTier = requestsPerMinute >= 1000 ? 'pro' : 'free';
      
      // Cache the result
      tierCache.set(tenantId, { 
        tier, 
        requestsPerMinute,
        timestamp: Date.now() 
      });

      return tier;
    }

    // Fallback to tenants table
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan, limits')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error(`[TenantTier] Error fetching tier for ${tenantId}:`, tenantError?.message);
      return DEFAULT_TIER;
    }

    // Map plan to rate limit tier
    // Plans: starter, pro, enterprise
    let tier: RateLimitTier;
    let requestsPerMinute = DEFAULT_REQUESTS_PER_MINUTE;
    
    switch (tenant.plan) {
      case 'pro':
      case 'enterprise':
        tier = 'pro';
        requestsPerMinute = 1000;
        break;
      case 'starter':
      case 'free':
      default:
        tier = 'free';
        requestsPerMinute = 100;
        break;
    }

    // Check if limits override is set in config
    if (tenant.limits?.rate_limit_tier) {
      tier = tenant.limits.rate_limit_tier as RateLimitTier;
    }
    if (tenant.limits?.rate_limit_requests_per_minute) {
      requestsPerMinute = tenant.limits.rate_limit_requests_per_minute;
    }

    // Cache the result
    tierCache.set(tenantId, { 
      tier, 
      requestsPerMinute,
      timestamp: Date.now() 
    });

    return tier;
  } catch (error) {
    console.error(`[TenantTier] Exception fetching tier for ${tenantId}:`, error);
    return DEFAULT_TIER;
  }
}

/**
 * Get tenant rate limit configuration from database
 * Returns the specific requests per minute limit for the tenant
 */
export async function getTenantRateLimit(tenantId: string): Promise<{ 
  tier: RateLimitTier; 
  requestsPerMinute: number;
  enabled: boolean;
}> {
  try {
    const supabase = getAdminClient();
    
    // Get from tenant_settings
    const { data: settings, error: settingsError } = await supabase
      .from('tenant_settings')
      .select('rate_limit_requests_per_minute, rate_limit_enabled')
      .eq('tenant_id', tenantId)
      .single();

    if (!settingsError && settings) {
      const requestsPerMinute = settings.rate_limit_requests_per_minute || DEFAULT_REQUESTS_PER_MINUTE;
      const tier: RateLimitTier = requestsPerMinute >= 1000 ? 'pro' : 'free';
      
      return {
        tier,
        requestsPerMinute,
        enabled: settings.rate_limit_enabled !== false,
      };
    }

    // Fallback to tier-based defaults
    const tier = await getTenantTierFromDB(tenantId);
    return {
      tier,
      requestsPerMinute: tier === 'pro' ? 1000 : 100,
      enabled: true,
    };
  } catch (error) {
    console.error(`[TenantTier] Error getting rate limit for ${tenantId}:`, error);
    return {
      tier: DEFAULT_TIER,
      requestsPerMinute: DEFAULT_REQUESTS_PER_MINUTE,
      enabled: true,
    };
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
  const requestsPerMinute = tier === 'pro' ? 1000 : 100;
  tierCache.set(tenantId, { 
    tier, 
    requestsPerMinute,
    timestamp: Date.now() 
  });
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
    
    const requestsPerMinute = tier === 'pro' ? 1000 : 100;
    
    // Update tenant_settings
    const { error: settingsError } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenantId,
        rate_limit_requests_per_minute: requestsPerMinute,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id',
      });

    if (settingsError) {
      console.error(`[TenantTier] Error updating settings for ${tenantId}:`, settingsError.message);
    }

    // Also update tenants table for backwards compatibility
    const plan = tier === 'pro' ? 'pro' : 'starter';
    
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({ 
        plan,
        limits: {
          rate_limit_tier: tier,
          rate_limit_requests_per_minute: requestsPerMinute,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (tenantError) {
      console.error(`[TenantTier] Error updating tier for ${tenantId}:`, tenantError.message);
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

/**
 * Update tenant rate limit settings
 */
export async function updateTenantRateLimit(
  tenantId: string,
  requestsPerMinute: number,
  enabled: boolean = true
): Promise<boolean> {
  try {
    const supabase = getAdminClient();
    
    const { error } = await supabase
      .from('tenant_settings')
      .upsert({
        tenant_id: tenantId,
        rate_limit_requests_per_minute: requestsPerMinute,
        rate_limit_enabled: enabled,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id',
      });

    if (error) {
      console.error(`[TenantTier] Error updating rate limit for ${tenantId}:`, error.message);
      return false;
    }

    // Clear cache to force refresh
    clearTenantTierCache(tenantId);

    return true;
  } catch (error) {
    console.error(`[TenantTier] Exception updating rate limit for ${tenantId}:`, error);
    return false;
  }
}
