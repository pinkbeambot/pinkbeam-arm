/**
 * Rate Limiting Service
 * 
 * Implements per-tenant rate limiting using Redis/Upstash.
 * Uses a sliding window algorithm for accurate rate limiting.
 * 
 * Tiers:
 * - Free: 100 requests per minute
 * - Pro: 1000 requests per minute
 */

import { Redis } from '@upstash/redis';

// Environment variables
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Rate limit tiers (requests per minute)
export const RATE_LIMITS = {
  free: 100,
  pro: 1000,
} as const;

// Rate limit window in seconds
const RATE_LIMIT_WINDOW = 60;

export type RateLimitTier = 'free' | 'pro';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface RateLimitInfo {
  tier: RateLimitTier;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Rate Limiting Service
 * 
 * Uses sliding window rate limiting with Redis sorted sets.
 * Each request is tracked with a timestamp, and expired entries are removed.
 */
class RateLimitService {
  private redis: Redis | null = null;
  private localCache: Map<string, { count: number; resetTime: number }> = new Map();
  private useLocalFallback: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis(): void {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      console.warn('[RateLimit] Redis credentials not found. Using local fallback for rate limiting.');
      this.useLocalFallback = true;
      return;
    }

    try {
      this.redis = new Redis({
        url: UPSTASH_REDIS_REST_URL,
        token: UPSTASH_REDIS_REST_TOKEN,
      });
    } catch (error) {
      console.error('[RateLimit] Failed to initialize Redis:', error);
      this.useLocalFallback = true;
    }
  }

  /**
   * Generate a rate limit key for a tenant
   */
  private getKey(tenantId: string): string {
    return `ratelimit:${tenantId}`;
  }

  /**
   * Get the rate limit for a tenant tier
   */
  getLimitForTier(tier: RateLimitTier): number {
    return RATE_LIMITS[tier];
  }

  /**
   * Check if a request is allowed for a tenant
   * Uses sliding window algorithm
   */
  async checkLimit(tenantId: string, tier: RateLimitTier = 'free'): Promise<RateLimitResult> {
    const limit = this.getLimitForTier(tier);
    const now = Date.now();
    const windowStart = now - (RATE_LIMIT_WINDOW * 1000);
    const key = this.getKey(tenantId);

    if (this.useLocalFallback || !this.redis) {
      return this.checkLimitLocal(key, limit, now, windowStart);
    }

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove entries outside the current window
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current entries in the window
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });
      
      // Set expiry on the key
      pipeline.expire(key, RATE_LIMIT_WINDOW);
      
      const results = await pipeline.exec();
      
      // Get the count (second operation result)
      const currentCount = (results?.[1] as number) || 0;
      const remaining = Math.max(0, limit - currentCount - 1);
      const resetTime = Math.ceil(now / 1000) + RATE_LIMIT_WINDOW;

      // Check if limit exceeded
      if (currentCount >= limit) {
        // Remove the request we just added since it's over limit
        await this.redis.zrem(key, `${now}-${Math.random()}`);
        
        return {
          allowed: false,
          limit,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil(RATE_LIMIT_WINDOW - (now - windowStart) / 1000),
        };
      }

      return {
        allowed: true,
        limit,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error('[RateLimit] Redis error, falling back to local:', error);
      return this.checkLimitLocal(key, limit, now, windowStart);
    }
  }

  /**
   * Local fallback rate limiting using in-memory Map
   * Used when Redis is unavailable
   */
  private checkLimitLocal(
    key: string,
    limit: number,
    now: number,
    windowStart: number
  ): RateLimitResult {
    const resetTime = Math.ceil(now / 1000) + RATE_LIMIT_WINDOW;
    
    // Get or create entry
    let entry = this.localCache.get(key);
    
    if (!entry || now > entry.resetTime * 1000) {
      // New window
      entry = { count: 0, resetTime };
    }

    // Check if limit exceeded
    if (entry.count >= limit) {
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetTime,
        retryAfter: Math.ceil((entry.resetTime * 1000 - now) / 1000),
      };
    }

    // Increment count
    entry.count++;
    this.localCache.set(key, entry);

    return {
      allowed: true,
      limit,
      remaining: limit - entry.count,
      resetTime,
    };
  }

  /**
   * Get current rate limit status without consuming a request
   */
  async getLimitStatus(tenantId: string, tier: RateLimitTier = 'free'): Promise<RateLimitInfo> {
    const limit = this.getLimitForTier(tier);
    const now = Date.now();
    const windowStart = now - (RATE_LIMIT_WINDOW * 1000);
    const key = this.getKey(tenantId);

    if (this.useLocalFallback || !this.redis) {
      const entry = this.localCache.get(key);
      const count = entry && now <= entry.resetTime * 1000 ? entry.count : 0;
      
      return {
        tier,
        limit,
        remaining: Math.max(0, limit - count),
        resetTime: entry?.resetTime || Math.ceil(now / 1000) + RATE_LIMIT_WINDOW,
      };
    }

    try {
      // Remove expired entries and count remaining
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);
      
      const results = await pipeline.exec();
      const currentCount = (results?.[1] as number) || 0;
      
      return {
        tier,
        limit,
        remaining: Math.max(0, limit - currentCount),
        resetTime: Math.ceil(now / 1000) + RATE_LIMIT_WINDOW,
      };
    } catch (error) {
      console.error('[RateLimit] Error getting limit status:', error);
      
      return {
        tier,
        limit,
        remaining: limit,
        resetTime: Math.ceil(now / 1000) + RATE_LIMIT_WINDOW,
      };
    }
  }

  /**
   * Reset rate limit for a tenant (useful for testing or manual resets)
   */
  async resetLimit(tenantId: string): Promise<void> {
    const key = this.getKey(tenantId);
    
    if (!this.useLocalFallback && this.redis) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.error('[RateLimit] Error resetting limit:', error);
      }
    }
    
    this.localCache.delete(key);
  }

  /**
   * Clean up local cache entries (call periodically to prevent memory leaks)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.localCache.entries()) {
      if (now > entry.resetTime * 1000) {
        this.localCache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();

// Default export for convenience
export default rateLimitService;
