/**
 * Stripe Configuration
 */
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('STRIPE_SECRET_KEY is not set. Billing features will be disabled.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  : null;

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// Validate that Stripe is configured
export function isStripeConfigured(): boolean {
  return !!stripe && !!STRIPE_WEBHOOK_SECRET;
}

// Price IDs mapping - these should be set via environment variables
export const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  free: undefined, // Free tier has no Stripe price
  starter: process.env.STRIPE_PRICE_STARTER || 'price_starter_test',
  pro: process.env.STRIPE_PRICE_PRO || 'price_pro_test',
  business: process.env.STRIPE_PRICE_BUSINESS || 'price_business_test',
  scale: process.env.STRIPE_PRICE_SCALE || 'price_scale_test',
  enterprise: undefined, // Enterprise is custom - contact sales
};

// Plan pricing for reference (in cents)
export const PLAN_PRICES: Record<string, number | null> = {
  free: 0,          // Free tier
  starter: 2900,    // $29/month (legacy)
  pro: 2900,        // $29/month
  business: 9900,   // $99/month
  scale: 29900,     // $299/month
  enterprise: null, // Custom pricing - contact sales
};

// Agent limits per tier
export const AGENT_LIMITS: Record<string, number | null> = {
  free: 1,          // 1 agent for free tier
  starter: 3,       // 3 agents for starter (legacy)
  pro: 5,           // 5 agents for Pro ($29/mo)
  business: 15,     // 15 agents for Business
  scale: 50,        // 50 agents for Scale
  enterprise: null, // unlimited for Enterprise
};

// Trial period in days
export const TRIAL_PERIOD_DAYS = 14;
