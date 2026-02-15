'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/lib/hooks/useTenant';

interface UseOnboardingReturn {
  isOpen: boolean;
  isLoading: boolean;
  error: Error | null;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  closeOnboarding: () => void;
}

/**
 * Hook to manage onboarding state for the current tenant.
 * Automatically checks if onboarding has been completed and shows the modal if not.
 */
export function useOnboarding(): UseOnboardingReturn {
  const { tenantId, tenant, isLoading: tenantLoading } = useTenant();
  const supabase = React.useMemo(() => createClient(), []);
  
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const [hasChecked, setHasChecked] = React.useState(false);

  // Check onboarding status when tenant data is loaded
  React.useEffect(() => {
    if (tenantLoading || !tenant) {
      return;
    }

    // Only show onboarding if explicitly false (new tenants)
    // If undefined or true, don't show
    const onboardingCompleted = tenant.onboarding_completed;
    
    if (onboardingCompleted === false) {
      setIsOpen(true);
    }
    
    setIsLoading(false);
    setHasChecked(true);
  }, [tenant, tenantLoading]);

  const completeOnboarding = React.useCallback(async () => {
    if (!tenantId) {
      setError(new Error('No tenant ID available'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ 
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to complete onboarding'));
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, supabase]);

  const skipOnboarding = React.useCallback(async () => {
    // Skip marks onboarding as completed without showing again
    await completeOnboarding();
  }, [completeOnboarding]);

  const closeOnboarding = React.useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    isLoading: isLoading || tenantLoading,
    error,
    completeOnboarding,
    skipOnboarding,
    closeOnboarding,
  };
}

export default useOnboarding;
