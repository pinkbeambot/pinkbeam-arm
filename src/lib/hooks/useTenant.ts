'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export interface UseTenantReturn {
  tenantId: string | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { session } = useAuth();

  const fetchTenant = async () => {
    if (!session?.access_token) {
      setTenantId(null);
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

      const data = await response.json();
      setTenantId(data.tenant_id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tenant';
      setError(new Error(errorMessage));
      setTenantId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [session?.access_token]);

  return {
    tenantId,
    isLoading,
    error,
    refetch: fetchTenant,
  };
}

export default useTenant;
