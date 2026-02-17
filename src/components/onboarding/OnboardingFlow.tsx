'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { useTenant } from '@/lib/hooks/useTenant';
import { useCreateAgent } from '@/lib/hooks/useAgents';
import { createClient } from '@/lib/supabase/client';
import type { CreateAgentInput } from '@/types';

import { WelcomeStep } from './steps/WelcomeStep';
import { CreateAgentStep } from './steps/CreateAgentStep';
import { ConfigureStep } from './steps/ConfigureStep';
import { CompleteStep } from './steps/CompleteStep';
import {
  ONBOARDING_STEPS,
  DEFAULT_ONBOARDING_DATA,
  type OnboardingData,
} from './types';

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

interface OnboardingState {
  data: OnboardingData;
  isCreating: boolean;
  error: string | null;
}

export function OnboardingFlow({ isOpen, onClose, onComplete, onSkip }: OnboardingFlowProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { tenantId } = useTenant();
  const supabase = React.useMemo(() => createClient(), []);
  const { createAgent, loading: createLoading } = useCreateAgent();

  const [state, setState] = React.useState<OnboardingState>({
    data: DEFAULT_ONBOARDING_DATA,
    isCreating: false,
    error: null,
  });

  React.useEffect(() => {
    if (isOpen) {
      setState({
        data: DEFAULT_ONBOARDING_DATA,
        isCreating: false,
        error: null,
      });
    }
  }, [isOpen]);

  const currentStep = state.data.step;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const updateData = React.useCallback((updates: Partial<OnboardingData>) => {
    setState(prev => ({
      ...prev,
      data: { ...prev.data, ...updates },
    }));
  }, []);

  const handleNext = React.useCallback(async () => {
    if (currentStep === 2) {
      if (!tenantId) {
        toast({
          title: 'Error',
          description: 'Tenant not available. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      setState(prev => ({ ...prev, isCreating: true, error: null }));

      try {
        const agentData: CreateAgentInput = {
          name: state.data.agentName,
          role: state.data.agentRole,
          description: state.data.agentDescription,
          model: state.data.agentModel,
          capabilities: state.data.agentCapabilities,
        };

        await createAgent({ ...agentData, tenant_id: tenantId });

        toast({
          title: 'Agent Created',
          description: `${state.data.agentName} has been created successfully.`,
        });

        setState(prev => ({
          ...prev,
          data: { ...prev.data, step: 3, completed: true },
          isCreating: false,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create agent';
        setState(prev => ({ ...prev, isCreating: false, error: errorMessage }));
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      return;
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setState(prev => ({
        ...prev,
        data: { ...prev.data, step: prev.data.step + 1 },
      }));
    } else {
      await handleComplete();
    }
  }, [currentStep, state.data, tenantId, createAgent, toast]);

  const handleBack = React.useCallback(() => {
    if (currentStep > 0) {
      setState(prev => ({
        ...prev,
        data: { ...prev.data, step: prev.data.step - 1 },
      }));
    }
  }, [currentStep]);

  const handleSkip = React.useCallback(async () => {
    if (tenantId) {
      try {
        await supabase
          .from('tenants')
          .update({
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenantId);
      } catch (err) {
        console.error('Failed to update onboarding status:', err);
      }
    }

    toast({
      title: 'Onboarding Skipped',
      description: 'You can always create agents from the Agents page.',
    });

    onSkip();
  }, [tenantId, supabase, onSkip, toast]);

  const handleComplete = React.useCallback(async () => {
    if (tenantId) {
      try {
        await supabase
          .from('tenants')
          .update({
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', tenantId);
      } catch (err) {
        console.error('Failed to update onboarding status:', err);
      }
    }

    toast({
      title: 'Welcome to ARM!',
      description: 'Your onboarding is complete. Happy automating!',
    });

    onComplete();
    router.push('/portal');
  }, [tenantId, supabase, onComplete, router, toast]);

  const stepProps = {
    onNext: handleNext,
    onBack: currentStep > 0 ? handleBack : undefined,
    onSkip: handleSkip,
    data: state.data,
    onUpdateData: updateData,
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleSkip();
            }
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-lg bg-background rounded-2xl shadow-2xl border overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="p-1 rounded-md hover:bg-muted transition-colors"
                    aria-label="Go back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    Step {currentStep + 1} of {ONBOARDING_STEPS.length}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm text-muted-foreground">
                    {ONBOARDING_STEPS[currentStep]?.title}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                aria-label="Skip onboarding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4 flex-shrink-0">
              <Progress value={progress} className="h-1.5" />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {state.isCreating ? (
                  <motion.div
                    key="creating"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-12 space-y-4"
                  >
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="text-muted-foreground">Creating your agent...</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {currentStep === 0 && <WelcomeStep {...stepProps} />}
                    {currentStep === 1 && <CreateAgentStep {...stepProps} />}
                    {currentStep === 2 && <ConfigureStep {...stepProps} />}
                    {currentStep === 3 && <CompleteStep {...stepProps} />}
                  </motion.div>
                )}
              </AnimatePresence>

              {state.error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
                >
                  {state.error}
                </motion.div>
              )}
            </div>

            <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-between flex-shrink-0">
              <button
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tour
              </button>

              <div className="flex items-center gap-1.5">
                {ONBOARDING_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (index <= currentStep) {
                        setState(prev => ({
                          ...prev,
                          data: { ...prev.data, step: index },
                        }));
                      }
                    }}
                    className={cn(
                      'w-2 h-2 rounded-full transition-colors',
                      index === currentStep && 'bg-primary w-4',
                      index < currentStep && 'bg-primary/50',
                      index > currentStep && 'bg-muted'
                    )}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnboardingFlow;
