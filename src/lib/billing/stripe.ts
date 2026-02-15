/**
 * Stripe Configuration
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Billing features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Validate that Stripe is configured
export function isStripeConfigured(): boolean {
  return !!stripe && !!STRIPE_WEBHOOK_SECRET;
}

// Price IDs mapping - these should be set via environment variables
export const STRIPE_PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_test',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_test',
  business: process.env.STRIPE_PRICE_BUSINESS || 'price_business_test',
  scale: process.env.STRIPE_PRICE_SCALE || 'price_scale_test',
};

// Plan pricing for reference (in cents)
export const PLAN_PRICES: Record<string, number> = {
  starter: 4900,    // $49/month
  pro: 19900,       // $199/month
  business: 49900,  // $499/month
  scale: 99900,     // $999/month
};

// Agent limits per tier
export const AGENT_LIMITS: Record<string, number | null> = {
  starter: 3,
  pro: 10,
  business: 25,
  scale: null, // unlimited
};

// Trial period in days
export const TRIAL_PERIOD_DAYS = 14;
