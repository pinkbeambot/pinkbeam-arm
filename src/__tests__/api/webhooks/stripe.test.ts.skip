/**
 * Stripe Webhook Tests
 * 
 * Unit tests for Stripe webhook handling using Vitest.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock Stripe
const mockStripeWebhooks = {
  constructEvent: vi.fn(),
};

vi.mock('@/lib/billing/stripe', () => ({
  stripe: {
    webhooks: mockStripeWebhooks,
  },
  STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
}));

// Mock billing service
vi.mock('@/lib/billing/service', () => ({
  updateTenantBilling: vi.fn(),
  saveInvoice: vi.fn(),
  logBillingEvent: vi.fn(),
  findTenantByStripeCustomerId: vi.fn(),
  findTenantByStripeSubscriptionId: vi.fn(),
}));

// Mock Supabase service role
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn().mockReturnValue({}),
}));

import { POST as handleWebhook } from '@/app/api/webhooks/stripe/route';
import {
  updateTenantBilling,
  saveInvoice,
  logBillingEvent,
  findTenantByStripeCustomerId,
} from '@/lib/billing/service';

describe('Stripe Webhook Handler', () => {
  const tenantId = 'test-tenant-123';
  const mockCustomerId = 'cus_test123';
  const mockSubscriptionId = 'sub_test456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Webhook Signature Verification', () => {
    it('should return 400 if signature is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: '{}',
      });

      const response = await handleWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing stripe-signature header');
    });

    it('should return 400 if signature is invalid', async () => {
      mockStripeWebhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: '{}',
        headers: { 'stripe-signature': 'invalid_sig' },
      });

      const response = await handleWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid signature');
    });
  });

  describe('invoice.paid event', () => {
    it('should handle successful payment', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test',
            customer: mockCustomerId,
            subscription: mockSubscriptionId,
            amount_due: 2900,
            amount_paid: 2900,
            currency: 'usd',
            status: 'paid',
            invoice_pdf: 'https://example.com/invoice.pdf',
            hosted_invoice_url: 'https://example.com/invoice',
            period_start: 1704067200, // Jan 1, 2024
            period_end: 1706745600, // Feb 1, 2024
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (findTenantByStripeCustomerId as ReturnType<typeof vi.fn>).mockResolvedValue(tenantId);
      (saveInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(saveInvoice).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        expect.objectContaining({
          stripe_invoice_id: 'in_test',
          amount_due: 2900,
          status: 'paid',
        })
      );
      expect(updateTenantBilling).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        expect.objectContaining({ subscription_status: 'active' })
      );
    });

    it('should handle invoice without subscription', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test',
            customer: mockCustomerId,
            subscription: null,
            amount_due: 1000,
            amount_paid: 1000,
            currency: 'usd',
            status: 'paid',
            invoice_pdf: null,
            hosted_invoice_url: null,
            period_start: null,
            period_end: null,
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (findTenantByStripeCustomerId as ReturnType<typeof vi.fn>).mockResolvedValue(tenantId);
      (saveInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      expect(saveInvoice).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        expect.objectContaining({
          stripe_subscription_id: null,
        })
      );
    });
  });

  describe('invoice.payment_failed event', () => {
    it('should handle failed payment', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test',
            customer: mockCustomerId,
            subscription: mockSubscriptionId,
            amount_due: 2900,
            amount_paid: 0,
            currency: 'usd',
            status: 'open',
            attempt_count: 1,
            next_payment_attempt: 1704153600,
            period_start: 1704067200,
            period_end: 1706745600,
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (findTenantByStripeCustomerId as ReturnType<typeof vi.fn>).mockResolvedValue(tenantId);
      (saveInvoice as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      expect(logBillingEvent).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        'invoice_payment_failed',
        expect.objectContaining({
          invoice_id: 'in_test',
          attempt_count: 1,
        }),
        'evt_test',
        'invoice.payment_failed'
      );
      expect(updateTenantBilling).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        expect.objectContaining({ subscription_status: 'past_due' })
      );
    });
  });

  describe('customer.subscription.updated event', () => {
    it('should handle subscription update', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: mockSubscriptionId,
            customer: mockCustomerId,
            status: 'active',
            metadata: { tenant_id: tenantId, tier: 'pro' },
            current_period_start: 1704067200,
            current_period_end: 1706745600,
            cancel_at_period_end: false,
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      expect(updateTenantBilling).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        expect.objectContaining({
          stripe_subscription_id: mockSubscriptionId,
          subscription_status: 'active',
          current_tier: 'pro',
          cancel_at_period_end: false,
        })
      );
    });

    it('should lookup tenant if not in metadata', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: mockSubscriptionId,
            customer: mockCustomerId,
            status: 'active',
            metadata: {},
            current_period_start: 1704067200,
            current_period_end: 1706745600,
            cancel_at_period_end: false,
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      const { findTenantByStripeSubscriptionId } = await import('@/lib/billing/service');
      (findTenantByStripeSubscriptionId as ReturnType<typeof vi.fn>).mockResolvedValue(tenantId);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      expect(findTenantByStripeSubscriptionId).toHaveBeenCalledWith(expect.anything(), mockSubscriptionId);
    });
  });

  describe('customer.subscription.deleted event', () => {
    it('should handle subscription cancellation', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: mockSubscriptionId,
            customer: mockCustomerId,
            metadata: { tenant_id: tenantId },
            canceled_at: 1704067200,
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      expect(updateTenantBilling).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        expect.objectContaining({
          subscription_status: 'canceled',
          current_tier: 'free',
          stripe_subscription_id: null,
          stripe_price_id: null,
          cancel_at_period_end: false,
        })
      );
    });
  });

  describe('checkout.session.completed event', () => {
    it('should handle new subscription checkout', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'sess_test',
            customer: mockCustomerId,
            subscription: mockSubscriptionId,
            metadata: { tenant_id: tenantId, tier: 'pro' },
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (updateTenantBilling as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      expect(updateTenantBilling).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        expect.objectContaining({
          stripe_customer_id: mockCustomerId,
          stripe_subscription_id: mockSubscriptionId,
          current_tier: 'pro',
          subscription_status: 'active',
        })
      );
    });

    it('should handle checkout without metadata gracefully', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'sess_test',
            customer: mockCustomerId,
            subscription: mockSubscriptionId,
            metadata: {},
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      // Should not call updateTenantBilling without tenant_id
      expect(updateTenantBilling).not.toHaveBeenCalled();
    });
  });

  describe('payment_method.attached event', () => {
    it('should log payment method attachment', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'payment_method.attached',
        data: {
          object: {
            id: 'pm_test',
            customer: mockCustomerId,
            type: 'card',
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (findTenantByStripeCustomerId as ReturnType<typeof vi.fn>).mockResolvedValue(tenantId);
      (logBillingEvent as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);

      expect(response.status).toBe(200);
      expect(logBillingEvent).toHaveBeenCalledWith(
        expect.anything(),
        tenantId,
        'payment_succeeded',
        expect.objectContaining({
          payment_method_id: 'pm_test',
          type: 'card',
        }),
        'evt_test',
        'payment_method.attached'
      );
    });
  });

  describe('Unhandled events', () => {
    it('should acknowledge unhandled events', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'charge.succeeded',
        data: { object: {} },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should return 500 on handler error', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test',
            customer: mockCustomerId,
          },
        },
      };

      mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
      (findTenantByStripeCustomerId as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

      const request = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
        method: 'POST',
        body: JSON.stringify(mockEvent),
        headers: { 'stripe-signature': 'valid_sig' },
      });

      const response = await handleWebhook(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Webhook handler error');
    });
  });
});
