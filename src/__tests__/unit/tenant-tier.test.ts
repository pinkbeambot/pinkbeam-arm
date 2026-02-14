/**
 * Tenant Tier Service Tests
 * 
 * Unit tests for the tenant tier service using Vitest.
 * Tests tier resolution, caching, and rate limit configuration.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Supabase client - must be before imports
vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
        upsert: vi.fn().mockReturnValue({
          error: null,
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            error: null,
          }),
        }),
      }),
    }),
  };
});

// Import after mocking
import { 
  getTenantTierFromDB, 
  getTenantRateLimit,
  clearTenantTierCache,
  setTenantTier,
  getCachedTiers,
  updateTenantTier,
  updateTenantRateLimit,
} from '@/lib/tenant-tier';
import { createClient } from '@supabase/supabase-js';

describe('TenantTierService', () => {
  const tenantId = 'test-tenant-123';
  const mockSingle = vi.fn();
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockUpsert = vi.fn();
  const mockUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    clearTenantTierCache();

    // Setup mock chain
    mockSingle.mockReset();
    mockEq.mockReturnValue({ single: mockSingle });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockUpsert.mockReturnValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({
      select: mockSelect,
      upsert: mockUpsert,
      update: mockUpdate,
    });
    
    // Update the mock implementation
    (createClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getTenantTierFromDB', () => {
    it('should return free tier by default', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('free');
    });

    it('should return pro tier for pro plan', async () => {
      // First call for tenant_settings (returns error to trigger fallback)
      // Second call for tenants table
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        })
        .mockResolvedValueOnce({
          data: { plan: 'pro', limits: {} },
          error: null,
        });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('pro');
    });

    it('should return free tier for starter plan', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        })
        .mockResolvedValueOnce({
          data: { plan: 'starter', limits: {} },
          error: null,
        });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('free');
    });

    it('should respect rate_limit_tier override in limits', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        })
        .mockResolvedValueOnce({
          data: { 
            plan: 'starter', 
            limits: { rate_limit_tier: 'pro' } 
          },
          error: null,
        });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('pro');
    });

    it('should read tier from tenant_settings when available', async () => {
      mockSingle.mockResolvedValue({
        data: { 
          rate_limit_requests_per_minute: 500, 
          rate_limit_enabled: true 
        },
        error: null,
      });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('free'); // 500 < 1000, so free tier
    });

    it('should return pro tier for high request limits', async () => {
      mockSingle.mockResolvedValue({
        data: { 
          rate_limit_requests_per_minute: 2000, 
          rate_limit_enabled: true 
        },
        error: null,
      });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('pro'); // 2000 >= 1000, so pro tier
    });
  });

  describe('getTenantRateLimit', () => {
    it('should return default rate limit', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const rateLimit = await getTenantRateLimit(tenantId);
      
      expect(rateLimit.tier).toBe('free');
      expect(rateLimit.requestsPerMinute).toBe(100);
      expect(rateLimit.enabled).toBe(true);
    });

    it('should return custom rate limit from settings', async () => {
      mockSingle.mockResolvedValue({
        data: { 
          rate_limit_requests_per_minute: 250, 
          rate_limit_enabled: true 
        },
        error: null,
      });

      const rateLimit = await getTenantRateLimit(tenantId);
      
      expect(rateLimit.requestsPerMinute).toBe(250);
      expect(rateLimit.enabled).toBe(true);
    });

    it('should respect disabled rate limiting', async () => {
      mockSingle.mockResolvedValue({
        data: { 
          rate_limit_requests_per_minute: 100, 
          rate_limit_enabled: false 
        },
        error: null,
      });

      const rateLimit = await getTenantRateLimit(tenantId);
      
      expect(rateLimit.enabled).toBe(false);
    });
  });

  describe('caching', () => {
    it('should cache tier results', async () => {
      mockSingle.mockResolvedValue({
        data: { 
          rate_limit_requests_per_minute: 500, 
          rate_limit_enabled: true 
        },
        error: null,
      });

      // First call
      await getTenantTierFromDB(tenantId);
      
      // Second call should use cache
      await getTenantTierFromDB(tenantId);
      
      // Should only call DB once
      expect(mockSingle).toHaveBeenCalledTimes(1);
    });

    it('should clear cache for specific tenant', async () => {
      mockSingle.mockResolvedValue({
        data: { rate_limit_requests_per_minute: 500, rate_limit_enabled: true },
        error: null,
      });

      await getTenantTierFromDB(tenantId);
      clearTenantTierCache(tenantId);
      await getTenantTierFromDB(tenantId);

      // Should call DB twice after clearing cache
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });

    it('should clear all cache when no tenant specified', async () => {
      mockSingle.mockResolvedValue({
        data: { rate_limit_requests_per_minute: 500, rate_limit_enabled: true },
        error: null,
      });

      await getTenantTierFromDB('tenant-1');
      await getTenantTierFromDB('tenant-2');
      clearTenantTierCache();
      await getTenantTierFromDB('tenant-1');
      await getTenantTierFromDB('tenant-2');

      // Should call DB 4 times (2 before + 2 after clear)
      expect(mockSingle).toHaveBeenCalledTimes(4);
    });
  });

  describe('setTenantTier', () => {
    it('should manually set tenant tier', async () => {
      setTenantTier(tenantId, 'pro');
      
      // Mock the DB call to return null (should use cache)
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('pro');
    });

    it('should appear in cached tiers', () => {
      setTenantTier(tenantId, 'pro');
      
      const cached = getCachedTiers();
      expect(cached[tenantId]).toBe('pro');
    });
  });

  describe('updateTenantTier', () => {
    it('should update tenant tier in database', async () => {
      mockUpsert.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ 
        eq: vi.fn().mockResolvedValue({ error: null }) 
      });

      const result = await updateTenantTier(tenantId, 'pro');
      expect(result).toBe(true);
    });

    it('should handle update errors gracefully', async () => {
      mockUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      });

      const result = await updateTenantTier(tenantId, 'pro');
      expect(result).toBe(false);
    });
  });

  describe('updateTenantRateLimit', () => {
    it('should update rate limit settings', async () => {
      mockUpsert.mockResolvedValue({ error: null });

      const result = await updateTenantRateLimit(tenantId, 250, true);
      expect(result).toBe(true);
    });

    it('should handle upsert errors gracefully', async () => {
      mockUpsert.mockResolvedValue({ error: { message: 'DB error' } });

      const result = await updateTenantRateLimit(tenantId, 250, true);
      expect(result).toBe(false);
    });

    it('should clear cache after update', async () => {
      mockUpsert.mockResolvedValue({ error: null });
      mockSingle.mockResolvedValue({
        data: { rate_limit_requests_per_minute: 500, rate_limit_enabled: true },
        error: null,
      });

      // Set cache
      setTenantTier(tenantId, 'free');
      
      // Update should clear cache
      await updateTenantRateLimit(tenantId, 250, true);
      
      const cached = getCachedTiers();
      expect(cached[tenantId]).toBeUndefined();
    });
  });

  describe('enterprise plan', () => {
    it('should return pro tier for enterprise plan', async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Not found' },
        })
        .mockResolvedValueOnce({
          data: { plan: 'enterprise', limits: {} },
          error: null,
        });

      const tier = await getTenantTierFromDB(tenantId);
      expect(tier).toBe('pro');
    });
  });
});
