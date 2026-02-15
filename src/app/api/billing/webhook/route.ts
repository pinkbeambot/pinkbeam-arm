import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/billing/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  updateTenantBilling,
  logBillingEvent,
  saveInvoice,
  findTenantByStripeCustomerId,
  findTenantByStripeSubscriptionId,
} from '@/lib/billing/service';
import type { SubscriptionTier } from '@/types/billing';

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events. No auth required — verified via Stripe signature.
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as unknown as Record<string, unknown>;
        const metadata = session.metadata as Record<string, string> | undefined;
        const tenantId = metadata?.tenant_id;
        const tier = metadata?.tier as SubscriptionTier | undefined;

        if (tenantId && tier) {
          const subscription = session.subscription as string | undefined;
          await updateTenantBilling(supabase, tenantId, {
            stripe_subscription_id: subscription,
            current_tier: tier,
            subscription_status: 'active',
          });

          await logBillingEvent(
            supabase,
            tenantId,
            'subscription_created',
            { tier, session_id: session.id },
            event.id,
            event.type
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as Record<string, unknown>;
        const subscriptionId = subscription.id as string;
        const customerId = subscription.customer as string;
        const status = subscription.status as string;
        const metadata = subscription.metadata as Record<string, string> | undefined;

        const tenantId =
          metadata?.tenant_id ||
          (await findTenantByStripeSubscriptionId(supabase, subscriptionId)) ||
          (await findTenantByStripeCustomerId(supabase, customerId));

        if (tenantId) {
          // Extract period dates safely via unknown cast
          const sub = subscription as unknown as Record<string, unknown>;
          const periodStart = sub.current_period_start
            ? new Date((sub.current_period_start as number) * 1000).toISOString()
            : null;
          const periodEnd = sub.current_period_end
            ? new Date((sub.current_period_end as number) * 1000).toISOString()
            : null;
          const cancelAtPeriodEnd = sub.cancel_at_period_end as boolean | undefined;
          const tier = metadata?.tier as SubscriptionTier | undefined;

          await updateTenantBilling(supabase, tenantId, {
            stripe_subscription_id: subscriptionId,
            subscription_status: status,
            current_period_starts_at: periodStart,
            current_period_ends_at: periodEnd,
            cancel_at_period_end: cancelAtPeriodEnd ?? false,
            ...(tier ? { current_tier: tier } : {}),
          });

          await logBillingEvent(
            supabase,
            tenantId,
            event.type === 'customer.subscription.created'
              ? 'subscription_created'
              : 'subscription_updated',
            { subscription_id: subscriptionId, status },
            event.id,
            event.type
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as unknown as Record<string, unknown>;
        const subscriptionId = subscription.id as string;
        const customerId = subscription.customer as string;
        const metadata = subscription.metadata as Record<string, string> | undefined;

        const tenantId =
          metadata?.tenant_id ||
          (await findTenantByStripeSubscriptionId(supabase, subscriptionId)) ||
          (await findTenantByStripeCustomerId(supabase, customerId));

        if (tenantId) {
          await updateTenantBilling(supabase, tenantId, {
            subscription_status: 'canceled',
            current_tier: 'starter',
            stripe_subscription_id: null,
            stripe_price_id: null,
          });

          await logBillingEvent(
            supabase,
            tenantId,
            'subscription_canceled',
            { subscription_id: subscriptionId },
            event.id,
            event.type
          );
        }
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.finalized': {
        const invoice = event.data.object as unknown as Record<string, unknown>;
        const customerId = invoice.customer as string;
        const tenantId = await findTenantByStripeCustomerId(supabase, customerId);

        if (tenantId) {
          const subscriptionId =
            'subscription' in invoice ? (invoice.subscription as string) : undefined;
          const paidAt =
            event.type === 'invoice.paid' ? new Date().toISOString() : null;

          await saveInvoice(supabase, tenantId, {
            stripe_invoice_id: invoice.id,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
            amount_due: invoice.amount_due,
            amount_paid: invoice.amount_paid,
            currency: invoice.currency ?? 'usd',
            status: invoice.status,
            invoice_pdf_url: invoice.invoice_pdf ?? null,
            hosted_invoice_url: invoice.hosted_invoice_url ?? null,
            period_start: invoice.period_start
              ? new Date((invoice.period_start as number) * 1000).toISOString()
              : null,
            period_end: invoice.period_end
              ? new Date((invoice.period_end as number) * 1000).toISOString()
              : null,
            paid_at: paidAt,
          });

          await logBillingEvent(
            supabase,
            tenantId,
            event.type === 'invoice.paid' ? 'invoice_paid' : 'invoice_payment_failed',
            { invoice_id: invoice.id, amount: invoice.amount_due },
            event.id,
            event.type
          );
        }
        break;
      }

      default:
        // Unhandled event type — acknowledge receipt
        break;
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
