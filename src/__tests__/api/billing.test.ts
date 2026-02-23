/**
 * Billing API Routes Tests
 * 
 * Unit tests for billing API routes using Vitest.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock authentication
vi.mock('@/lib/api/auth', () => ({
  authenticateRequest: vi.fn(),
  isErrorResponse: vi.fn((auth) => auth && 'error' in auth),
}));

// Mock billing service
vi.mock('@/lib/billing/service', () => ({
  getTenantBilling: vi.fn(),
  updateTenantBilling: vi.fn(),
  getUsageWithLimits: vi.fn(),
  getRecentInvoices: vi.fn(),
  getAllSubscriptionTiers: vi.fn(),
  findTenantByStripeCustomerId: vi.fn(),
  findTenantByStripeSubscriptionId: vi.fn(),
  saveInvoice: vi.fn(),
  logBillingEvent: vi.fn(),
}));

// Mock Stripe
vi.mock('@/lib/billing/stripe', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(),
      },
    },
    paymentMethods: {
      list: vi.fn(),
      attach: vi.fn(),
      detach: vi.fn(),
    },
  },
  STRIPE_PRICE_IDS: {
    free: undefined,
    starter: 'price_starter_test',
    pro: 'price_pro_test',
    business: 'price_business_test',
    scale: 'price_scale_test',
    enterprise: undefined,
  },
  TRIAL_PERIOD_DAYS: 14,
  isStripeConfigured: vi.fn().mockReturnValue(true),
}));

import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import {
  getTenantBilling,
  updateTenantBilling,
  getUsageWithLimits,
  getRecentInvoices,
} from '@/lib/billing/service';
import { stripe } from '@/lib/billing/stripe';

// Import route handlers
import { GET as getSubscription, POST as createSubscription, PATCH as updateSubscription, DELETE as cancelSubscription } from '@/app/api/billing/subscription/route';
import { GET as getInvoices } from '@/app/api/billing/invoices/route';
import { GET as getPaymentMethods, POST as addPaymentMethod, DELETE as deletePaymentMethod } from '@/app/api/billing/payment-method/route';

describe('Billing API Routes', () => {
  const tenantId = 'test-tenant-123';
  const userId = 'test-user-456';
  const mockAuth = { tenantId, userId, supabase: {} as never };

  beforeEach(() => {
    vi.clearAllMocks();
    (authenticateRequest as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuth);
  });

  describe('GET /api/billing/subscription', () => {
    it('should return subscription details', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: 'sub_test',
        subscriptionStatus: 'active',
        currentTier: 'pro',
        trialEndsAt: null,
        currentPeriodStartsAt: '2026-01-01T00:00:00Z',
        currentPeriodEndsAt: '2026-02-01T00:00:00Z',
        cancelAtPeriodEnd: false,
      };

      const mockUsage = {
        agentCount: 3,
        taskCount: 50,
        fileCount: 5,
        storageUsedMb: 500,
        agentLimit: 5,
        taskLimit: 5000,
        storageLimitMb: 5000,
        agentsUsedPercent: 60,
        tasksUsedPercent: 1,
        storageUsedPercent: 10,
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);
      (getUsageWithLimits as ReturnType<typeof vi.fn>).mockResolvedValue(mockUsage);

      const request = new NextRequest('http://localhost:3000/api/billing/subscription');
      const response = await getSubscription(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.subscription.tier).toBe('pro');
      expect(data.data.subscription.status).toBe('active');
      expect(data.data.usage.agentCount).toBe(3);
    });

    it('should return 404 if billing not found', async () => {
      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/billing/subscription');
      const response = await getSubscription(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Subscription not found');
    });

    it('should return 401 if not authenticated', async () => {
      (authenticateRequest as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: 'Unauthorized',
        status: 401,
      });

      const request = new NextRequest('http://localhost:3000/api/billing/subscription');
      const response = await getSubscription(request);

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/billing/subscription', () => {
    it('should create checkout session for new subscription', async () => {
      const mockBilling = {
        stripeCustomerId: null,
        subscriptionStatus: 'trialing',
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      
      const mockStripe = stripe as unknown as {
        customers: { create: ReturnType<typeof vi.fn> };
        checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
      };
      
      mockStripe.customers.create.mockResolvedValue({ id: 'cus_new' });
      mockStripe.checkout.sessions.create.mockResolvedValue({
        id: 'sess_test',
        url: 'https://checkout.stripe.com/test',
      });

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await createSubscription(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.sessionId).toBe('sess_test');
      expect(data.data.url).toBe('https://checkout.stripe.com/test');
    });

    it('should return 409 if already subscribed', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: 'sub_test',
        subscriptionStatus: 'active',
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await createSubscription(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Already subscribed');
    });

    it('should return 400 for invalid tier', async () => {
      const mockBilling = { subscriptionStatus: 'trialing' };
      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'POST',
        body: JSON.stringify({ tier: 'invalid_tier' }),
      });

      const response = await createSubscription(request);

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/billing/subscription', () => {
    it('should upgrade subscription plan', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: 'sub_test',
        subscriptionStatus: 'active',
        currentTier: 'pro',
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      
      const mockStripe = stripe as unknown as {
        subscriptions: { retrieve: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
      };
      
      mockStripe.subscriptions.retrieve.mockResolvedValue({
        id: 'sub_test',
        items: { data: [{ id: 'si_test' }] },
      });
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test',
        status: 'active',
      });

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'business' }),
      });

      const response = await updateSubscription(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.subscription.tier).toBe('business');
    });

    it('should return 404 if no active subscription', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: null,
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'PATCH',
        body: JSON.stringify({ tier: 'pro' }),
      });

      const response = await updateSubscription(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('No active subscription');
    });
  });

  describe('DELETE /api/billing/subscription', () => {
    it('should cancel subscription at period end', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: 'sub_test',
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      
      const mockStripe = stripe as unknown as {
        subscriptions: { update: ReturnType<typeof vi.fn> };
      };
      
      mockStripe.subscriptions.update.mockResolvedValue({
        id: 'sub_test',
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: 1738368000,
      });

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      });

      const response = await cancelSubscription(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.subscription.cancelAtPeriodEnd).toBe(true);
    });

    it('should return 404 if no subscription to cancel', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
        stripeSubscriptionId: null,
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);

      const request = new NextRequest('http://localhost:3000/api/billing/subscription', {
        method: 'DELETE',
      });

      const response = await cancelSubscription(request);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/billing/invoices', () => {
    it('should return invoice list', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          stripeInvoiceId: 'in_test1',
          amountDue: 2900,
          amountPaid: 2900,
          status: 'paid',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ];

      (getRecentInvoices as ReturnType<typeof vi.fn>).mockResolvedValue(mockInvoices);

      const request = new NextRequest('http://localhost:3000/api/billing/invoices');
      const response = await getInvoices(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.invoices).toHaveLength(1);
      expect(data.data.invoices[0].status).toBe('paid');
    });

    it('should filter by status', async () => {
      (getRecentInvoices as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/billing/invoices?status=paid');
      const response = await getInvoices(request);

      expect(response.status).toBe(200);
      expect(getRecentInvoices).toHaveBeenCalledWith(expect.anything(), tenantId, 10, 'paid');
    });
  });

  describe('Payment Methods', () => {
    it('should add a payment method', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      
      const mockStripe = stripe as unknown as {
        paymentMethods: { attach: ReturnType<typeof vi.fn> };
        customers: { update: ReturnType<typeof vi.fn> };
      };
      
      mockStripe.paymentMethods.attach.mockResolvedValue({ id: 'pm_test' });
      mockStripe.customers.update.mockResolvedValue({ id: 'cus_test' });

      const request = new NextRequest('http://localhost:3000/api/billing/payment-method', {
        method: 'POST',
        body: JSON.stringify({ paymentMethodId: 'pm_test', setAsDefault: true }),
      });

      const response = await addPaymentMethod(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.paymentMethodId).toBe('pm_test');
    });

    it('should get payment methods', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);
      
      const mockStripe = stripe as unknown as {
        paymentMethods: { list: ReturnType<typeof vi.fn> };
        customers: { retrieve: ReturnType<typeof vi.fn> };
      };
      
      mockStripe.paymentMethods.list.mockResolvedValue({
        data: [
          {
            id: 'pm_test',
            type: 'card',
            card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2026 },
          },
        ],
      });
      mockStripe.customers.retrieve.mockResolvedValue({
        id: 'cus_test',
        deleted: false,
        invoice_settings: { default_payment_method: 'pm_test' },
      });

      const request = new NextRequest('http://localhost:3000/api/billing/payment-method');
      const response = await getPaymentMethods(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.paymentMethods).toHaveLength(1);
      expect(data.data.paymentMethods[0].isDefault).toBe(true);
    });

    it('should delete a payment method', async () => {
      const mockBilling = {
        stripeCustomerId: 'cus_test',
      };

      (getTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(mockBilling);
      
      const mockStripe = stripe as unknown as {
        paymentMethods: { detach: ReturnType<typeof vi.fn> };
      };
      
      mockStripe.paymentMethods.detach.mockResolvedValue({ id: 'pm_test' });

      const request = new NextRequest('http://localhost:3000/api/billing/payment-method?id=pm_test', {
        method: 'DELETE',
      });

      const response = await deletePaymentMethod(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.deleted).toBe(true);
    });
  });
});
