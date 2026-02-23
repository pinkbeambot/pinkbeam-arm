/**
 * Stripe Billing Integration Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn(),
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({
      data: [{ agent_count: 2, task_count: 10, file_count: 5, storage_used_mb: 100 }],
      error: null,
    }),
  }),
}));

vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    customers: { create: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
    subscriptions: { retrieve: vi.fn(), update: vi.fn() },
    checkout: { sessions: { create: vi.fn() } },
    billingPortal: { sessions: { create: vi.fn() } },
    paymentMethods: { list: vi.fn(), attach: vi.fn(), detach: vi.fn() },
  })),
}));

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  getTenantBilling,
  updateTenantBilling,
  getTenantUsage,
  getUsageWithLimits,
  canCreateAgent,
  getSubscriptionTier,
  getAllSubscriptionTiers,
  getRecentInvoices,
  saveInvoice,
  logBillingEvent,
  findTenantByStripeCustomerId,
  findTenantByStripeSubscriptionId,
} from '@/lib/billing/service';
import {
  STRIPE_PRICE_IDS,
  PLAN_PRICES,
  AGENT_LIMITS,
  TRIAL_PERIOD_DAYS,
} from '@/lib/billing/stripe';

describe('Stripe Billing Integration', () => {
  const tenantId = 'test-tenant-123';
  const mockStripeCustomerId = 'cus_test123';
  const mockStripeSubscriptionId = 'sub_test456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Stripe Configuration', () => {
    it('should have correct price IDs structure', () => {
      expect(STRIPE_PRICE_IDS).toHaveProperty('free');
      expect(STRIPE_PRICE_IDS).toHaveProperty('pro');
      expect(STRIPE_PRICE_IDS).toHaveProperty('enterprise');
      expect(STRIPE_PRICE_IDS.free).toBeUndefined();
      expect(STRIPE_PRICE_IDS.enterprise).toBeUndefined();
    });

    it('should have correct plan prices', () => {
      expect(PLAN_PRICES.free).toBe(0);
      expect(PLAN_PRICES.pro).toBe(2900);
      expect(PLAN_PRICES.enterprise).toBeNull();
    });

    it('should have correct agent limits', () => {
      expect(AGENT_LIMITS.free).toBe(1);
      expect(AGENT_LIMITS.pro).toBe(5);
      expect(AGENT_LIMITS.enterprise).toBeNull();
    });

    it('should have 14 day trial period', () => {
      expect(TRIAL_PERIOD_DAYS).toBe(14);
    });
  });

  describe('getTenantBilling', () => {
    it('should return tenant billing info', async () => {
      const mockBilling = {
        stripe_customer_id: mockStripeCustomerId,
        stripe_subscription_id: mockStripeSubscriptionId,
        stripe_price_id: 'price_pro_test',
        subscription_status: 'active',
        current_tier: 'pro',
        trial_ends_at: null,
        current_period_starts_at: '2026-01-01T00:00:00Z',
        current_period_ends_at: '2026-02-01T00:00:00Z',
        cancel_at_period_end: false,
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockBilling, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getTenantBilling(supabase, tenantId);

      expect(result?.stripeCustomerId).toBe(mockStripeCustomerId);
      expect(result?.currentTier).toBe('pro');
    });

    it('should return null if billing not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const supabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getTenantBilling(supabase, tenantId);
      expect(result).toBeNull();
    });
  });

  describe('canCreateAgent', () => {
    it('should return true if under agent limit', async () => {
      const supabase = {
        rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await canCreateAgent(supabase, tenantId);
      expect(result).toBe(true);
    });

    it('should return false if over agent limit', async () => {
      const supabase = {
        rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await canCreateAgent(supabase, tenantId);
      expect(result).toBe(false);
    });
  });
});
