'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export interface OnboardingSteps {
  created_agent: boolean;
  assigned_task: boolean;
  viewed_activity: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  onboarding_completed?: boolean;
  onboarding_completed_at?: string | null;
  onboarding_steps?: OnboardingSteps;
  created_at: string;
}

export interface UseTenantReturn {
  tenantId: string | null;
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * useTenant Hook
 * 
 * Fetches the current user's tenant ID from the API.
 * This hook should be used in all portal pages instead of
 * the hardcoded DEMO_TENANT_ID.
 * 
 * Example usage:
 * ```tsx
 * const { tenantId, isLoading, error } = useTenant();
 * const { agents } = useAgentsRealtime(tenantId);
 * ```
 */
export function useTenant(): UseTenantReturn {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  const fetchTenant = async () => {
    if (!session?.access_token) {
      setTenantId(null);
      setTenant(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/user/tenant', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch tenant: ${response.status}`);
      }

      const { data } = await response.json();
      setTenantId(data.tenant_id);
      setTenant(data.tenant || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tenant';
      setError(new Error(errorMessage));
      setTenantId(null);
      setTenant(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [session?.access_token]);

  return {
    tenantId,
    tenant,
    isLoading,
    error,
    refetch: fetchTenant,
  };
}

export default useTenant;
