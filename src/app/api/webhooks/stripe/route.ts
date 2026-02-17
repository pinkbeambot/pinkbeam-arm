import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/billing/stripe';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import {
  updateTenantBilling,
  saveInvoice,
  logBillingEvent,
  findTenantByStripeCustomerId,
  findTenantByStripeSubscriptionId,
} from '@/lib/billing/service';
import type { SubscriptionTier } from '@/types/billing';

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events. No auth required — verified via Stripe signature.
 */
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
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
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const tenantId = await findTenantByStripeCustomerId(supabase, invoice.customer as string);

        if (tenantId) {
          await saveInvoice(supabase, tenantId, {
            stripe_invoice_id: invoice.id,
            stripe_customer_id: invoice.customer as string,
            stripe_subscription_id: (invoice.subscription as string) ?? null,
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

          await logBillingEvent(
            supabase,
            tenantId,
            'invoice_paid',
            {
              invoice_id: invoice.id,
              amount: invoice.amount_due,
              subscription_id: invoice.subscription,
            },
            event.id,
            event.type
          );

          if (invoice.subscription) {
            await updateTenantBilling(supabase, tenantId, {
              subscription_status: 'active',
            });
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const tenantId = await findTenantByStripeCustomerId(supabase, invoice.customer as string);

        if (tenantId) {
          await saveInvoice(supabase, tenantId, {
            stripe_invoice_id: invoice.id,
            stripe_customer_id: invoice.customer as string,
            stripe_subscription_id: (invoice.subscription as string) ?? null,
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
            event.id,
            event.type
          );

          if (invoice.subscription) {
            await updateTenantBilling(supabase, tenantId, {
              subscription_status: 'past_due',
            });
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId =
          subscription.metadata?.tenant_id ||
          (await findTenantByStripeSubscriptionId(supabase, subscription.id)) ||
          (await findTenantByStripeCustomerId(supabase, subscription.customer as string));

        if (tenantId) {
          const tier = subscription.metadata?.tier as SubscriptionTier | undefined;

          await updateTenantBilling(supabase, tenantId, {
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            current_period_starts_at: subscription.current_period_start
              ? new Date(subscription.current_period_start * 1000).toISOString()
              : null,
            current_period_ends_at: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            ...(tier ? { current_tier: tier } : {}),
          });

          await logBillingEvent(
            supabase,
            tenantId,
            'subscription_updated',
            {
              subscription_id: subscription.id,
              status: subscription.status,
              tier,
              cancel_at_period_end: subscription.cancel_at_period_end,
            },
            event.id,
            event.type
          );
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const tenantId =
          subscription.metadata?.tenant_id ||
          (await findTenantByStripeSubscriptionId(supabase, subscription.id)) ||
          (await findTenantByStripeCustomerId(supabase, subscription.customer as string));

        if (tenantId) {
          await updateTenantBilling(supabase, tenantId, {
            subscription_status: 'canceled',
            current_tier: 'free',
            stripe_subscription_id: null,
            stripe_price_id: null,
            cancel_at_period_end: false,
          });

          await logBillingEvent(
            supabase,
            tenantId,
            'subscription_canceled',
            {
              subscription_id: subscription.id,
              canceled_at: subscription.canceled_at,
            },
            event.id,
            event.type
          );
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata;

        if (metadata?.tenant_id && metadata?.tier) {
          const updates: Record<string, unknown> = {
            current_tier: metadata.tier,
            subscription_status: 'active',
          };

          if (session.subscription) {
            updates.stripe_subscription_id = session.subscription as string;
          }

          if (session.customer) {
            updates.stripe_customer_id = session.customer as string;
          }

          await updateTenantBilling(supabase, metadata.tenant_id, updates);

          await logBillingEvent(
            supabase,
            metadata.tenant_id,
            'subscription_created',
            {
              tier: metadata.tier,
              session_id: session.id,
              customer_id: session.customer,
              subscription_id: session.subscription,
            },
            event.id,
            event.type
          );
        }
        break;
      }

      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod;
        const tenantId = await findTenantByStripeCustomerId(
          supabase,
          paymentMethod.customer as string
        );

        if (tenantId) {
          await logBillingEvent(
            supabase,
            tenantId,
            'payment_succeeded',
            {
              payment_method_id: paymentMethod.id,
              type: paymentMethod.type,
            },
            event.id,
            event.type
          );
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe webhook event: ${event.type}`);
        break;
    }
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
