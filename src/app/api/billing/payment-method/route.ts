import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { authenticateRequest, isErrorResponse } from '@/lib/api/auth';
import { stripe } from '@/lib/billing/stripe';
import { getTenantBilling } from '@/lib/billing/service';
import { addPaymentMethodSchema } from '@/lib/validation';
import { z } from 'zod';

/**
 * POST /api/billing/payment-method
 * Adds a new payment method to the customer's account.
 * Returns a client secret for Stripe Elements to confirm the setup.
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
    const { tenantId, supabase } = auth;

    const body = await request.json();
    const { paymentMethodId, setAsDefault } = addPaymentMethodSchema.parse(body);

    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 400 }
      );
    }

    // Attach payment method to customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: billing.stripeCustomerId,
    });

    // Set as default if requested
    if (setAsDefault) {
      await stripe.customers.update(billing.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    return NextResponse.json({
      data: {
        paymentMethodId,
        setAsDefault: setAsDefault ?? false,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    console.error('Error in POST /api/billing/payment-method:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/billing/payment-method
 * Returns the customer's payment methods.
 */
export async function GET(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeCustomerId) {
      return NextResponse.json(
        { data: { paymentMethods: [], defaultPaymentMethod: null } },
        { status: 200 }
      );
    }

    // Get customer's payment methods
    const paymentMethods = await stripe.paymentMethods.list({
      customer: billing.stripeCustomerId,
      type: 'card',
    });

    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(billing.stripeCustomerId);
    const defaultPaymentMethod =
      typeof customer === 'object' && !customer.deleted
        ? customer.invoice_settings?.default_payment_method
        : null;

    return NextResponse.json({
      data: {
        paymentMethods: paymentMethods.data.map((pm) => ({
          id: pm.id,
          type: pm.type,
          card: pm.card
            ? {
                brand: pm.card.brand,
                last4: pm.card.last4,
                expMonth: pm.card.exp_month,
                expYear: pm.card.exp_year,
              }
            : null,
          isDefault: pm.id === defaultPaymentMethod,
        })),
        defaultPaymentMethod,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/billing/payment-method:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/billing/payment-method
 * Removes a payment method from the customer's account.
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe is not configured' },
        { status: 503 }
      );
    }

    const auth = await authenticateRequest(request);
    if (isErrorResponse(auth)) return auth;
    const { tenantId, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    const billing = await getTenantBilling(supabase, tenantId);

    if (!billing?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found' },
        { status: 400 }
      );
    }

    // Detach payment method
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({
      data: {
        paymentMethodId,
        deleted: true,
      },
    });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 400 }
      );
    }
    console.error('Error in DELETE /api/billing/payment-method:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
