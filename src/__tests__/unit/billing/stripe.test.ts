/**
 * Stripe Billing Integration Tests
 * 
 * Unit tests for the Stripe billing service using Vitest.
 * Tests subscription management, invoicing, and webhook handling.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock Supabase first (before Stripe to avoid hoisting issues)
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

// Mock Stripe
const mockCustomersCreate = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockCustomersUpdate = vi.fn();
const mockSubscriptionsRetrieve = vi.fn();
const mockSubscriptionsUpdate = vi.fn();
const mockCheckoutSessionsCreate = vi.fn();
const mockBillingPortalSessionsCreate = vi.fn();
const mockPaymentMethodsList = vi.fn();
const mockPaymentMethodsAttach = vi.fn();
const mockPaymentMethodsDetach = vi.fn();

vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        create: mockCustomersCreate,
        retrieve: mockCustomersRetrieve,
        update: mockCustomersUpdate,
      },
      subscriptions: {
        retrieve: mockSubscriptionsRetrieve,
        update: mockSubscriptionsUpdate,
      },
      checkout: {
        sessions: {
          create: mockCheckoutSessionsCreate,
        },
      },
      billingPortal: {
        sessions: {
          create: mockBillingPortalSessionsCreate,
        },
      },
      paymentMethods: {
        list: mockPaymentMethodsList,
        attach: mockPaymentMethodsAttach,
        detach: mockPaymentMethodsDetach,
      },
    })),
  };
});

// Import after mocking
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
  const userId = 'test-user-456';
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
      expect(PLAN_PRICES.pro).toBe(2900); // $29/month
      expect(PLAN_PRICES.enterprise).toBeNull();
    });

    it('should have correct agent limits', () => {
      expect(AGENT_LIMITS.free).toBe(1);
      expect(AGENT_LIMITS.pro).toBe(5);
      expect(AGENT_LIMITS.enterprise).toBeNull(); // unlimited
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
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getTenantBilling(supabase, tenantId);

      expect(result).toEqual({
        stripeCustomerId: mockStripeCustomerId,
        stripeSubscriptionId: mockStripeSubscriptionId,
        stripePriceId: 'price_pro_test',
        subscriptionStatus: 'active',
        currentTier: 'pro',
        trialEndsAt: null,
        currentPeriodStartsAt: '2026-01-01T00:00:00Z',
        currentPeriodEndsAt: '2026-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
      });
    });

    it('should return null if billing not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getTenantBilling(supabase, tenantId);

      expect(result).toBeNull();
    });
  });

  describe('updateTenantBilling', () => {
    it('should update tenant billing successfully', async () => {
      const mockEq = vi.fn().mockReturnValue({ error: null });
      
      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({ eq: mockEq }),
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const updates = { current_tier: 'pro', subscription_status: 'active' };
      
      await expect(updateTenantBilling(supabase, tenantId, updates)).resolves.not.toThrow();
    });

    it('should throw error on update failure', async () => {
      const mockEq = vi.fn().mockReturnValue({ error: { message: 'DB error' } });
      
      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({ eq: mockEq }),
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const updates = { current_tier: 'pro' };
      
      await expect(updateTenantBilling(supabase, tenantId, updates)).rejects.toThrow(
        'Failed to update tenant billing'
      );
    });
  });

  describe('getTenantUsage', () => {
    it('should return tenant usage', async () => {
      const supabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{ agent_count: 3, task_count: 50, file_count: 10, storage_used_mb: 500 }],
          error: null,
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getTenantUsage(supabase, tenantId);

      expect(result).toEqual({
        agentCount: 3,
        taskCount: 50,
        fileCount: 10,
        storageUsedMb: 500,
      });
    });

    it('should return zeros on error', async () => {
      const supabase = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getTenantUsage(supabase, tenantId);

      expect(result).toEqual({
        agentCount: 0,
        taskCount: 0,
        fileCount: 0,
        storageUsedMb: 0,
      });
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

    it('should return false on error', async () => {
      const supabase = {
        rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await canCreateAgent(supabase, tenantId);

      expect(result).toBe(false);
    });
  });

  describe('Subscription Tiers', () => {
    it('should get a single subscription tier', async () => {
      const mockTier = {
        id: 'pro',
        name: 'Pro',
        description: 'Pro plan',
        stripe_price_id: 'price_pro_test',
        price_monthly: 2900,
        agent_limit: 5,
        task_limit: 5000,
        storage_limit_mb: 5000,
        features: ['feature1', 'feature2'],
        is_active: true,
        sort_order: 2,
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockTier, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getSubscriptionTier(supabase, 'pro');

      expect(result?.id).toBe('pro');
      expect(result?.name).toBe('Pro');
      expect(result?.priceMonthly).toBe(2900);
      expect(result?.agentLimit).toBe(5);
    });

    it('should get all active subscription tiers', async () => {
      const mockTiers = [
        { id: 'free', name: 'Free', description: '', stripe_price_id: '', price_monthly: 0, agent_limit: 1, task_limit: 100, storage_limit_mb: 100, features: [], is_active: true, sort_order: 1 },
        { id: 'pro', name: 'Pro', description: '', stripe_price_id: 'price_pro', price_monthly: 2900, agent_limit: 5, task_limit: 5000, storage_limit_mb: 5000, features: [], is_active: true, sort_order: 2 },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockTiers, error: null }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getAllSubscriptionTiers(supabase);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('free');
      expect(result[1].id).toBe('pro');
    });
  });

  describe('Invoices', () => {
    it('should get recent invoices', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          stripe_invoice_id: 'in_test1',
          amount_due: 2900,
          amount_paid: 2900,
          currency: 'usd',
          status: 'paid',
          invoice_pdf_url: 'https://example.com/invoice1.pdf',
          hosted_invoice_url: 'https://example.com/invoice1',
          period_start: '2026-01-01T00:00:00Z',
          period_end: '2026-02-01T00:00:00Z',
          paid_at: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
        },
      ];

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({ data: mockInvoices, error: null }),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await getRecentInvoices(supabase, tenantId);

      expect(result).toHaveLength(1);
      expect(result[0].stripeInvoiceId).toBe('in_test1');
      expect(result[0].amountDue).toBe(2900);
      expect(result[0].status).toBe('paid');
    });

    it('should save invoice', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const invoice = {
        stripe_invoice_id: 'in_test1',
        stripe_customer_id: mockStripeCustomerId,
        stripe_subscription_id: mockStripeSubscriptionId,
        amount_due: 2900,
        amount_paid: 2900,
        currency: 'usd',
        status: 'paid',
        invoice_pdf_url: 'https://example.com/invoice.pdf',
        hosted_invoice_url: 'https://example.com/invoice',
        period_start: '2026-01-01T00:00:00Z',
        period_end: '2026-02-01T00:00:00Z',
        paid_at: '2026-01-01T00:00:00Z',
      };

      await expect(saveInvoice(supabase, tenantId, invoice)).resolves.not.toThrow();
    });
  });

  describe('Billing Events', () => {
    it('should log billing event', async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockResolvedValue({ error: null }),
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const eventData = { tier: 'pro', session_id: 'sess_test' };

      await expect(
        logBillingEvent(supabase, tenantId, 'subscription_created', eventData, 'evt_test', 'checkout.session.completed')
      ).resolves.not.toThrow();
    });
  });

  describe('Tenant Lookup', () => {
    it('should find tenant by Stripe customer ID', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await findTenantByStripeCustomerId(supabase, mockStripeCustomerId);

      expect(result).toBe(tenantId);
    });

    it('should find tenant by Stripe subscription ID', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: tenantId }, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await findTenantByStripeSubscriptionId(supabase, mockStripeSubscriptionId);

      expect(result).toBe(tenantId);
    });

    it('should return null if tenant not found', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: mockSelect,
        }),
      } as unknown as ReturnType<typeof createServiceRoleClient>;

      const result = await findTenantByStripeCustomerId(supabase, 'cus_nonexistent');

      expect(result).toBeNull();
    });
  });
});
