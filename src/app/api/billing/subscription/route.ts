import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import {
  getTenantBilling,
  getUsageWithLimits,
  updateTenantBilling,
} from '@/lib/billing/service';
import { stripe } from '@/lib/billing/stripe';
import { updateSubscriptionSchema } from '@/lib/validation';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const billing = await getTenantBilling(supabase, tenantId);
    if (!billing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const usage = await getUsageWithLimits(supabase, tenantId, billing.currentTier);

    return NextResponse.json({
      data: {
        subscription: {
          status: billing.subscriptionStatus,
          tier: billing.currentTier,
          stripeCustomerId: billing.stripeCustomerId,
          stripeSubscriptionId: billing.stripeSubscriptionId,
          trialEndsAt: billing.trialEndsAt,
          currentPeriodStartsAt: billing.currentPeriodStartsAt,
          currentPeriodEndsAt: billing.currentPeriodEndsAt,
          cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
        },
        usage,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing/subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const body = await request.json();
    const { tier, successUrl, cancelUrl } = updateSubscriptionSchema.parse(body);

    const billing = await getTenantBilling(supabase, tenantId);

    if (billing?.subscriptionStatus === 'active' && billing?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'Already subscribed. Use PATCH to change plans.' },
        { status: 409 }
      );
    }

    let customerId = billing?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { tenant_id: tenantId, user_id: userId },
      });
      customerId = customer.id;
      await updateTenantBilling(supabase, tenantId, { stripe_customer_id: customerId });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const { STRIPE_PRICE_IDS, TRIAL_PERIOD_DAYS } = await import('@/lib/billing/stripe');
    const priceId = STRIPE_PRICE_IDS[tier];

    if (!priceId) {
      return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 });
    }

    const isTrialing = billing?.subscriptionStatus === 'trialing';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${appUrl}/portal/settings/billing?success=true`,
      cancel_url: cancelUrl || `${appUrl}/portal/settings/billing?canceled=true`,
      metadata: { tenant_id: tenantId, tier },
      subscription_data: {
        metadata: { tenant_id: tenantId, tier },
        ...(isTrialing ? { trial_period_days: TRIAL_PERIOD_DAYS } : {}),
      },
    });

    return NextResponse.json({ data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error in POST /api/billing/subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const body = await request.json();
    const { tier } = updateSubscriptionSchema.parse(body);

    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found. Use POST to create one.' },
        { status: 404 }
      );
    }

    const { STRIPE_PRICE_IDS } = await import('@/lib/billing/stripe');
    const newPriceId = STRIPE_PRICE_IDS[tier];

    if (!newPriceId) {
      return NextResponse.json({ error: `Invalid tier: ${tier}` }, { status: 400 });
    }

    const subscription = await stripe.subscriptions.retrieve(billing.stripeSubscriptionId);

    if (!subscription.items.data.length) {
      return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 });
    }

    const updatedSubscription = await stripe.subscriptions.update(billing.stripeSubscriptionId, {
      items: [{ id: subscription.items.data[0].id, price: newPriceId }],
      metadata: { tenant_id: tenantId, tier },
      proration_behavior: 'create_prorations',
    });

    await updateTenantBilling(supabase, tenantId, {
      current_tier: tier,
      stripe_price_id: newPriceId,
      subscription_status: updatedSubscription.status,
    });

    return NextResponse.json({
      data: { subscription: { id: updatedSubscription.id, status: updatedSubscription.status, tier } },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 });
    }
    console.error('Error in PATCH /api/billing/subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 });
    }

    const canceledSubscription = await stripe.subscriptions.update(billing.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    await updateTenantBilling(supabase, tenantId, { cancel_at_period_end: true });

    return NextResponse.json({
      data: {
        subscription: {
          id: canceledSubscription.id,
          status: canceledSubscription.status,
          cancelAtPeriodEnd: canceledSubscription.cancel_at_period_end,
          currentPeriodEnd: new Date(canceledSubscription.current_period_end * 1000).toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Error in DELETE /api/billing/subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
