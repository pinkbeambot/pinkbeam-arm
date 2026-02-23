'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import type {
  TenantBilling,
  UsageWithLimits,
  SubscriptionTierConfig,
  Invoice,
  SubscriptionTier,
} from '@/types/billing';

interface BillingData {
  billing: TenantBilling | null;
  usage: UsageWithLimits | null;
  plans: SubscriptionTierConfig[];
  invoices: Invoice[];
}

interface UseBillingReturn extends BillingData {
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createCheckoutSession: (tier: SubscriptionTier) => Promise<string | null>;
  createPortalSession: () => Promise<string | null>;
}

export function useBilling(): UseBillingReturn {
  const { session } = useAuth();
  const [data, setData] = useState<BillingData>({
    billing: null,
    usage: null,
    plans: [],
    invoices: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBilling = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/v1/billing', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch billing: ${res.status}`);
      }

      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch billing'));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const createCheckoutSession = useCallback(
    async (tier: SubscriptionTier): Promise<string | null> => {
      if (!session?.access_token) return null;

      try {
        const res = await fetch('/api/v1/billing/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ tier }),
        });

        if (!res.ok) {
          throw new Error(`Checkout failed: ${res.status}`);
        }

        const json = await res.json();
        return json.data.url;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Checkout failed'));
        return null;
      }
    },
    [session?.access_token]
  );

  const createPortalSession = useCallback(async (): Promise<string | null> => {
    if (!session?.access_token) return null;

    try {
      const res = await fetch('/api/v1/billing/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        throw new Error(`Portal session failed: ${res.status}`);
      }

      const json = await res.json();
      return json.data.url;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Portal session failed'));
      return null;
    }
  }, [session?.access_token]);

  return {
    ...data,
    loading,
    error,
    refetch: fetchBilling,
    createCheckoutSession,
    createPortalSession,
  };
}

/**
 * Hook to check if the tenant can create more agents.
 */
export function useAgentLimit() {
  const { usage } = useBilling();

  const agentCount = usage?.agentCount ?? 0;
  const agentLimit = usage?.agentLimit ?? null;
  const isAtLimit = agentLimit !== null && agentCount >= agentLimit;
  const remaining = agentLimit !== null ? Math.max(0, agentLimit - agentCount) : null;
  const percentUsed = usage?.agentsUsedPercent ?? null;

  return { agentCount, agentLimit, isAtLimit, remaining, percentUsed };
}

/**
 * Hook for trial-related information.
 */
export function useTrial() {
  const { billing } = useBilling();

  const isTrialing = billing?.subscriptionStatus === 'trialing';
  const trialEndsAt = billing?.trialEndsAt ? new Date(billing.trialEndsAt) : null;
  const now = new Date();
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;
  const isTrialExpired = isTrialing && trialEndsAt && trialEndsAt < now;

  return { isTrialing, trialEndsAt, daysRemaining, isTrialExpired };
}
