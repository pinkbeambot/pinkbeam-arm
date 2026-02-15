'use client';

import { useCallback, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTenant, type OnboardingSteps } from '@/lib/hooks/useTenant';

type StepKey = keyof OnboardingSteps;

interface UseOnboardingStepsReturn {
  steps: OnboardingSteps;
  isComplete: boolean;
  markStepComplete: (step: StepKey) => Promise<void>;
  refetch: () => Promise<void>;
}

const DEFAULT_STEPS: OnboardingSteps = {
  created_agent: false,
  assigned_task: false,
  viewed_activity: false,
};

/**
 * Hook for tracking and updating individual onboarding steps.
 *
 * Reads step completion state from the tenant data and provides
 * a function to mark steps as complete via the API.
 *
 * Usage:
 * ```tsx
 * const { steps, markStepComplete } = useOnboardingSteps();
 * // Mark a step when user takes action:
 * await markStepComplete('created_agent');
 * ```
 */
export function useOnboardingSteps(): UseOnboardingStepsReturn {
  const { session } = useAuth();
  const { tenant, refetch } = useTenant();
  const pendingRef = useRef<Set<string>>(new Set());

  const steps: OnboardingSteps = tenant?.onboarding_steps ?? DEFAULT_STEPS;
  const isComplete = steps.created_agent && steps.assigned_task && steps.viewed_activity;

  const markStepComplete = useCallback(async (step: StepKey) => {
    // Skip if already complete or already in-flight
    if (steps[step] || pendingRef.current.has(step)) return;
    if (!session?.access_token) return;

    pendingRef.current.add(step);

    try {
      const response = await fetch('/api/onboarding', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ step }),
      });

      if (response.ok) {
        await refetch();
      }
    } catch {
      // Silently fail - onboarding step tracking is non-critical
    } finally {
      pendingRef.current.delete(step);
    }
  }, [steps, session?.access_token, refetch]);

  return {
    steps,
    isComplete,
    markStepComplete,
    refetch,
  };
}

export default useOnboardingSteps;
