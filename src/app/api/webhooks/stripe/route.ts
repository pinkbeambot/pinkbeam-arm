import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/billing/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  createWebhookProcessor,
  type WebhookHandler,
} from '@/lib/billing/webhook-processor';
import {
  updateTenantBilling,
  saveInvoice,
  logBillingEvent,
  findTenantByStripeCustomerId,
  findTenantByStripeSubscriptionId,
  createFailedPayment,
  updateFailedPaymentStatus,
  recordPaymentMethodEvent,
} from '@/lib/billing/service';
import type { SubscriptionTier } from '@/types/billing';

// Helper to safely get subscription ID from invoice
function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return (invoice as unknown as { subscription?: string }).subscription ?? null;
}

// Helper to safely get payment intent from invoice
function getInvoicePaymentIntentId(invoice: Stripe.Invoice): string | null {
  return (invoice as unknown as { payment_intent?: string }).payment_intent ?? null;
}

// Helper to safely get subscription period dates
function getSubscriptionPeriodDates(subscription: Stripe.Subscription) {
  const sub = subscription as unknown as {
    current_period_start?: number;
    current_period_end?: number;
  };
  return {
    currentPeriodStart: sub.current_period_start,
    currentPeriodEnd: sub.current_period_end,
  };
}

/**
 * POST /api/webhooks/stripe
 * Production-hardened Stripe webhook handler with idempotency, retry logic, and comprehensive error handling.
 */
export async function POST(request: NextRequest) {
  // Verify Stripe is configured
  if (!stripe) {
    console.error('Stripe is not configured');
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  // Read raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  // Verify webhook signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: 'Invalid signature', details: errorMessage },
      { status: 400 }
    );
  }

  // Log webhook receipt
  console.log(`[Webhook] Received ${event.type} (${event.id}) at ${new Date().toISOString()}`);

  // Initialize Supabase and webhook processor
  const supabase = createServiceRoleClient();
  const { processor } = createWebhookProcessor(supabase);

  // Register event handlers
  registerWebhookHandlers(processor, supabase);

  // Process the event with idempotency and retry logic
  try {
    const result = await processor.processEvent(event.id, event.type, event.data.object as unknown as Record<string, unknown>);

    if (result.success) {
      if (result.processed) {
        console.log(`[Webhook] Successfully processed ${event.type} (${event.id})`);
      } else {
        console.log(`[Webhook] Event ${event.id} skipped: ${result.error}`);
      }
      return NextResponse.json({ received: true, processed: result.processed });
    } else {
      console.error(`[Webhook] Failed to process ${event.type} (${event.id}):`, result.error);

      // Return 500 for retryable errors, 200 for non-retryable (to prevent Stripe from retrying)
      if (result.retryable) {
        return NextResponse.json(
          { 
            error: 'Processing failed', 
            details: result.error,
            retryable: true,
            nextRetryAt: result.nextRetryAt?.toISOString(),
          },
          { status: 500 }
        );
      } else {
        // Acknowledge receipt but don't retry
        return NextResponse.json({ 
          received: true, 
          processed: false,
          error: result.error,
          retryable: false,
        });
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Webhook] Unexpected error processing ${event.type} (${event.id}):`, errorMessage);
    return NextResponse.json(
      { error: 'Internal server error', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * Register all webhook event handlers
 */
function registerWebhookHandlers(
  processor: ReturnType<typeof createWebhookProcessor>['processor'],
  supabase: ReturnType<typeof createServiceRoleClient>
): void {
  // Invoice payment succeeded
  processor.registerHandler('invoice.paid', createInvoicePaidHandler(supabase));

  // Invoice payment failed
  processor.registerHandler('invoice.payment_failed', createInvoicePaymentFailedHandler(supabase));

  // Subscription created
  processor.registerHandler('customer.subscription.created', createSubscriptionCreatedHandler(supabase));

  // Subscription updated
  processor.registerHandler('customer.subscription.updated', createSubscriptionUpdatedHandler(supabase));

  // Subscription deleted (canceled)
  processor.registerHandler('customer.subscription.deleted', createSubscriptionDeletedHandler(supabase));

  // Checkout session completed
  processor.registerHandler('checkout.session.completed', createCheckoutCompletedHandler(supabase));

  // Payment method attached
  processor.registerHandler('payment_method.attached', createPaymentMethodAttachedHandler(supabase));

  // Payment method detached
  processor.registerHandler('payment_method.detached', createPaymentMethodDetachedHandler(supabase));

  // Payment intent failed
  processor.registerHandler('payment_intent.payment_failed', createPaymentIntentFailedHandler(supabase));

  // Customer updated
  processor.registerHandler('customer.updated', createCustomerUpdatedHandler(supabase));
}

// ============================================================================
// Event Handlers
// ============================================================================

function createInvoicePaidHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    const invoice = payload as unknown as Stripe.Invoice;
    const tenantId = await findTenantByStripeCustomerId(supabase, invoice.customer as string);

    if (!tenantId) {
      console.warn(`[Webhook] No tenant found for customer ${invoice.customer}`);
      return;
    }

    // Save invoice to database
    await saveInvoice(supabase, tenantId, {
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      stripe_subscription_id: getInvoiceSubscriptionId(invoice),
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency ?? 'usd',
      status: invoice.status ?? 'paid',
      invoice_pdf_url: invoice.invoice_pdf ?? null,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      paid_at: new Date().toISOString(),
    });

    // Log billing event
    await logBillingEvent(
      supabase,
      tenantId,
      'invoice_paid',
      {
        invoice_id: invoice.id,
        amount: invoice.amount_due,
        subscription_id: getInvoiceSubscriptionId(invoice),
      },
      invoice.id,
      'invoice.paid'
    );

    // Update subscription status if applicable
    if (getInvoiceSubscriptionId(invoice)) {
      await updateTenantBilling(supabase, tenantId, {
        subscription_status: 'active',
      });
    }

    // If there was a failed payment for this invoice, mark it as resolved
    await updateFailedPaymentStatus(supabase, invoice.id, 'resolved', 'retry_success');
  };
}

function createInvoicePaymentFailedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    const invoice = payload as unknown as Stripe.Invoice;
    const tenantId = await findTenantByStripeCustomerId(supabase, invoice.customer as string);

    if (!tenantId) {
      console.warn(`[Webhook] No tenant found for customer ${invoice.customer}`);
      return;
    }

    // Save invoice with failed status
    await saveInvoice(supabase, tenantId, {
      stripe_invoice_id: invoice.id,
      stripe_customer_id: invoice.customer as string,
      stripe_subscription_id: getInvoiceSubscriptionId(invoice),
      amount_due: invoice.amount_due,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency ?? 'usd',
      status: invoice.status ?? 'open',
      invoice_pdf_url: invoice.invoice_pdf ?? null,
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end
        ? new Date(invoice.period_end * 1000).toISOString()
        : null,
      paid_at: null,
    });

    // Log billing event
    await logBillingEvent(
      supabase,
      tenantId,
      'invoice_payment_failed',
      {
        invoice_id: invoice.id,
        amount: invoice.amount_due,
        attempt_count: invoice.attempt_count,
        next_payment_attempt: invoice.next_payment_attempt,
      },
      invoice.id,
      'invoice.payment_failed'
    );

    // Update subscription status
    if (getInvoiceSubscriptionId(invoice)) {
      await updateTenantBilling(supabase, tenantId, {
        subscription_status: 'past_due',
      });
    }
  };
}

// Stub handlers for additional webhook events
function createSubscriptionCreatedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Subscription created:', (payload as unknown as Stripe.Subscription).id);
  };
}

function createSubscriptionUpdatedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Subscription updated:', (payload as unknown as Stripe.Subscription).id);
  };
}

function createSubscriptionDeletedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Subscription deleted:', (payload as unknown as Stripe.Subscription).id);
  };
}

function createCheckoutCompletedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Checkout completed:', (payload as unknown as Stripe.Checkout.Session).id);
  };
}

function createPaymentMethodAttachedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Payment method attached:', (payload as unknown as Stripe.PaymentMethod).id);
  };
}

function createPaymentMethodDetachedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Payment method detached:', (payload as unknown as Stripe.PaymentMethod).id);
  };
}

function createPaymentIntentFailedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Payment intent failed:', (payload as unknown as Stripe.PaymentIntent).id);
  };
}

function createCustomerUpdatedHandler(supabase: ReturnType<typeof createServiceRoleClient>): WebhookHandler {
  return async (payload) => {
    console.log('[Webhook] Customer updated:', (payload as unknown as Stripe.Customer).id);
  };
}
