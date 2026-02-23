'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/lib/hooks/useTenant';

interface OnboardingCheckOptions {
  redirectToOnboarding?: boolean;
  skipPaths?: string[];
}

interface OnboardingCheckReturn {
  isChecking: boolean;
  shouldShowOnboarding: boolean;
  onboardingCompleted: boolean | null;
  error: Error | null;
}

export function useOnboardingCheck(options: OnboardingCheckOptions = {}): OnboardingCheckReturn {
  const {
    redirectToOnboarding = true,
    skipPaths = ['/portal/settings', '/portal/help'],
  } = options;

  const { tenant, isLoading: tenantLoading } = useTenant();

  const [state, setState] = React.useState<{
    isChecking: boolean;
    shouldShowOnboarding: boolean;
    onboardingCompleted: boolean | null;
    error: Error | null;
  }>({
    isChecking: true,
    shouldShowOnboarding: false,
    onboardingCompleted: null,
    error: null,
  });

  React.useEffect(() => {
    if (tenantLoading) {
      return;
    }

    if (!tenant) {
      setState({
        isChecking: false,
        shouldShowOnboarding: false,
        onboardingCompleted: null,
        error: new Error('No tenant available'),
      });
      return;
    }

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const shouldSkipPath = skipPaths.some(path => currentPath.startsWith(path));

    if (shouldSkipPath) {
      setState({
        isChecking: false,
        shouldShowOnboarding: false,
        onboardingCompleted: tenant.onboarding_completed ?? false,
        error: null,
      });
      return;
    }

    const onboardingCompleted = tenant.onboarding_completed;
    const needsOnboarding = onboardingCompleted === false;

    if (needsOnboarding && redirectToOnboarding) {
      setState({
        isChecking: false,
        shouldShowOnboarding: true,
        onboardingCompleted: false,
        error: null,
      });
    } else {
      setState({
        isChecking: false,
        shouldShowOnboarding: false,
        onboardingCompleted: onboardingCompleted ?? false,
        error: null,
      });
    }
  }, [tenant, tenantLoading, redirectToOnboarding, skipPaths]);

  return state;
}

export function withOnboardingCheck<P extends object>(
  Component: React.ComponentType<P>,
  options: OnboardingCheckOptions = {}
): React.FC<P> {
  return function WithOnboardingCheckWrapper(props: P) {
    const { isChecking, shouldShowOnboarding, error } = useOnboardingCheck(options);

    if (isChecking) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-destructive">Failed to check onboarding status</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
