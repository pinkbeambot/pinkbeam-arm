/**
 * Analytics Cache Utility
 * 
 * Provides caching for expensive analytics queries to improve API performance.
 * Uses in-memory cache with configurable TTL per endpoint.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class AnalyticsCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Get cached data if it exists and hasn't expired
   */
  get<T>(key: string, ttlMs: number): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < ttlMs) {
      return entry.data as T;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Store data in cache
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const analyticsCache = new AnalyticsCache();

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  OVERVIEW: 5 * 60 * 1000,       // 5 minutes
  LEADERBOARD: 5 * 60 * 1000,    // 5 minutes
  AGENT: 5 * 60 * 1000,          // 5 minutes
  ROI: 10 * 60 * 1000,           // 10 minutes (less frequent updates)
  BOTTLENECKS: 2 * 60 * 1000,    // 2 minutes (more dynamic)
} as const;

// Cache key generators
export const cacheKeys = {
  overview: (tenantId: string, days: number) => `analytics:overview:${tenantId}:${days}d`,
  leaderboard: (tenantId: string, days: number, sortBy: string, limit: number) => 
    `analytics:leaderboard:${tenantId}:${days}:${sortBy}:${limit}`,
  agent: (tenantId: string, agentId: string, days: number) => 
    `analytics:agent:${tenantId}:${agentId}:${days}`,
  roi: (tenantId: string, days: number, hourlyRate: number) => 
    `analytics:roi:${tenantId}:${days}:${hourlyRate}`,
  bottlenecks: (tenantId: string, hours: number) => 
    `analytics:bottlenecks:${tenantId}:${hours}`,
};

export default AnalyticsCache;
