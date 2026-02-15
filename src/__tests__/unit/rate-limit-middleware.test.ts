/**
 * Rate Limit Middleware Tests
 * 
 * Unit tests for the rate limit middleware using Vitest.
 * Tests middleware behavior, header handling, and error cases.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { 
  rateLimitMiddleware, 
  addRateLimitHeaders, 
  withRateLimit,
  clearTenantTierCache,
  RATE_LIMITS,
} from '@/lib/middleware/rate-limit';

// Mock rate-limit service
const mockCheckLimit = vi.fn();
const mockGetLimitStatus = vi.fn();
const mockResetLimit = vi.fn();

vi.mock('@/lib/rate-limit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limit')>('@/lib/rate-limit');
  return {
    ...actual,
    rateLimitService: {
      checkLimit: (...args: unknown[]) => mockCheckLimit(...args),
      getLimitStatus: (...args: unknown[]) => mockGetLimitStatus(...args),
      resetLimit: (...args: unknown[]) => mockResetLimit(...args),
    },
  };
});

// Mock tenant-tier service
const mockGetTenantRateLimit = vi.fn();

vi.mock('@/lib/tenant-tier', async () => {
  const actual = await vi.importActual<typeof import('@/lib/tenant-tier')>('@/lib/tenant-tier');
  return {
    ...actual,
    getTenantRateLimit: (...args: unknown[]) => mockGetTenantRateLimit(...args),
    getTenantTierFromDB: vi.fn(),
    clearTenantTierCache: vi.fn(),
  };
});

// Helper to create mock request
function createMockRequest(path: string = '/api/test'): NextRequest {
  return new NextRequest(new URL(`http://localhost:3000${path}`), {
    headers: new Headers(),
  });
}

describe('RateLimitMiddleware', () => {
  const tenantId = 'test-tenant-123';

  beforeEach(() => {
    vi.clearAllMocks();
    clearTenantTierCache();
    
    // Default mock implementation
    mockGetTenantRateLimit.mockResolvedValue({
      tier: 'free',
      requestsPerMinute: 100,
      enabled: true,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('rateLimitMiddleware', () => {
    it('should allow request when under limit', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetTime: 1707868800,
      });

      const request = createMockRequest();
      const result = await rateLimitMiddleware(request, tenantId);
      
      expect(result).toBeNull();
    });

    it('should set rate limit headers on request when allowed', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetTime: 1707868800,
      });

      const request = createMockRequest();
      await rateLimitMiddleware(request, tenantId);
      
      expect(request.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(request.headers.get('X-RateLimit-Remaining')).toBe('99');
      expect(request.headers.get('X-RateLimit-Reset')).toBe('1707868800');
      expect(request.headers.get('X-RateLimit-Tier')).toBe('free');
    });

    it('should return 429 response when limit exceeded', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetTime: 1707868800,
        retryAfter: 45,
      });

      const request = createMockRequest();
      const result = await rateLimitMiddleware(request, tenantId);
      
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('should include Retry-After header on 429 response', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetTime: 1707868800,
        retryAfter: 45,
      });

      const request = createMockRequest();
      const result = await rateLimitMiddleware(request, tenantId);
      
      expect(result?.headers.get('Retry-After')).toBe('45');
      expect(result?.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('X-RateLimit-Reset')).toBe('1707868800');
    });

    it('should include error details in 429 response', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetTime: 1707868800,
        retryAfter: 45,
      });

      const request = createMockRequest();
      const result = await rateLimitMiddleware(request, tenantId);
      
      const body = await result?.json();
      expect(body.error).toBe('Rate limit exceeded');
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.retryAfter).toBe(45);
    });

    it('should skip rate limiting when disabled for tenant', async () => {
      mockGetTenantRateLimit.mockResolvedValue({
        tier: 'free',
        requestsPerMinute: 100,
        enabled: false,
      });

      const request = createMockRequest();
      const result = await rateLimitMiddleware(request, tenantId);
      
      expect(result).toBeNull();
      expect(mockCheckLimit).not.toHaveBeenCalled();
    });

    it('should use custom limit when provided', async () => {
      mockGetTenantRateLimit.mockResolvedValue({
        tier: 'pro',
        requestsPerMinute: 500,
        enabled: true,
      });

      mockCheckLimit.mockResolvedValue({
        allowed: true,
        limit: 500,
        remaining: 499,
        resetTime: 1707868800,
      });

      const request = createMockRequest();
      await rateLimitMiddleware(request, tenantId);
      
      expect(mockCheckLimit).toHaveBeenCalledWith(tenantId, 'pro', 500);
    });

    it('should fail open on error', async () => {
      mockCheckLimit.mockRejectedValue(new Error('Redis error'));

      const request = createMockRequest();
      const result = await rateLimitMiddleware(request, tenantId);
      
      // Should return null (allow request) on error
      expect(result).toBeNull();
    });
  });

  describe('addRateLimitHeaders', () => {
    it('should add rate limit headers to response', async () => {
      mockGetTenantRateLimit.mockResolvedValue({
        tier: 'free',
        requestsPerMinute: 100,
        enabled: true,
      });

      mockGetLimitStatus.mockResolvedValue({
        tier: 'free',
        limit: 100,
        remaining: 85,
        resetTime: 1707868800,
      });

      const response = NextResponse.json({ success: true });
      const result = await addRateLimitHeaders(response, tenantId);
      
      expect(result.headers.get('X-RateLimit-Limit')).toBe('100');
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('85');
      expect(result.headers.get('X-RateLimit-Reset')).toBe('1707868800');
      expect(result.headers.get('X-RateLimit-Tier')).toBe('free');
    });

    it('should return original response on error', async () => {
      mockGetLimitStatus.mockRejectedValue(new Error('Service error'));

      const response = NextResponse.json({ success: true });
      const result = await addRateLimitHeaders(response, tenantId);
      
      expect(result).toBe(response);
    });
  });

  describe('withRateLimit HOC', () => {
    it('should wrap handler with rate limiting', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: true,
        limit: 100,
        remaining: 99,
        resetTime: 1707868800,
      });

      mockGetLimitStatus.mockResolvedValue({
        tier: 'free',
        limit: 100,
        remaining: 99,
        resetTime: 1707868800,
      });

      const mockHandler = vi.fn().mockResolvedValue(
        NextResponse.json({ data: 'test' })
      );

      const wrappedHandler = withRateLimit(mockHandler);
      const request = createMockRequest();
      request.headers.set('x-tenant-id', tenantId);
      
      const result = await wrappedHandler(request);
      
      expect(mockHandler).toHaveBeenCalled();
      expect(result.headers.get('X-RateLimit-Limit')).toBe('100');
    });

    it('should return 400 if tenant ID is missing', async () => {
      const mockHandler = vi.fn();
      const wrappedHandler = withRateLimit(mockHandler);
      
      const request = createMockRequest();
      // No x-tenant-id header
      
      const result = await wrappedHandler(request);
      
      expect(result.status).toBe(400);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should return 429 if rate limit exceeded', async () => {
      mockCheckLimit.mockResolvedValue({
        allowed: false,
        limit: 100,
        remaining: 0,
        resetTime: 1707868800,
        retryAfter: 45,
      });

      const mockHandler = vi.fn();
      const wrappedHandler = withRateLimit(mockHandler);
      
      const request = createMockRequest();
      request.headers.set('x-tenant-id', tenantId);
      
      const result = await wrappedHandler(request);
      
      expect(result.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('RATE_LIMITS export', () => {
    it('should export correct rate limit constants', () => {
      expect(RATE_LIMITS.free).toBe(100);
      expect(RATE_LIMITS.pro).toBe(1000);
    });
  });
});
