import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { stripe, STRIPE_PRICE_IDS, TRIAL_PERIOD_DAYS } from '@/lib/billing/stripe';
import { getTenantBilling, updateTenantBilling } from '@/lib/billing/service';
import { createCheckoutSchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * POST /api/billing/checkout
 * Creates a Stripe Checkout session for the given tier.
 */
export async function POST(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, userId, supabase } = auth;

    const body = await request.json();
    const { tier, successUrl, cancelUrl } = createCheckoutSchema.parse(body);

    const priceId = STRIPE_PRICE_IDS[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Invalid tier: ${tier}` },
        { status: 400 }
      );
    }

    const billing = await getTenantBilling(supabase, tenantId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create or reuse Stripe customer
    let customerId = billing?.stripeCustomerId;
    if (!customerId) {
      const { data: user } = await supabase
        .from('users')
        .select('auth_id')
        .eq('auth_id', userId)
        .single();

      const customer = await stripe.customers.create({
        metadata: {
          tenant_id: tenantId,
          user_id: userId,
        },
      });
      customerId = customer.id;

      await updateTenantBilling(supabase, tenantId, {
        stripe_customer_id: customerId,
      });
    }

    // Determine trial eligibility
    const isTrialing = billing?.subscriptionStatus === 'trialing';

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${appUrl}/portal/settings/billing?success=true`,
      cancel_url: cancelUrl || `${appUrl}/portal/settings/billing?canceled=true`,
      metadata: {
        tenant_id: tenantId,
        tier,
      },
      subscription_data: {
        metadata: {
          tenant_id: tenantId,
          tier,
        },
        ...(isTrialing ? { trial_period_days: TRIAL_PERIOD_DAYS } : {}),
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({
      data: {
        sessionId: session.id,
        url: session.url,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/billing/checkout:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
