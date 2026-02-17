import type { AgentRole, Capability } from '@/types';

export interface OnboardingStepProps {
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  data: OnboardingData;
  onUpdateData: (data: Partial<OnboardingData>) => void;
}

export interface OnboardingData {
  step: number;
  agentName: string;
  agentRole: AgentRole;
  agentDescription: string;
  agentModel: string;
  agentCapabilities: Capability[];
  skipOnboarding: boolean;
  completed: boolean;
}

export const DEFAULT_ONBOARDING_DATA: OnboardingData = {
  step: 0,
  agentName: '',
  agentRole: 'worker',
  agentDescription: '',
  agentModel: 'claude-3-sonnet',
  agentCapabilities: ['decide', 'escalate'],
  skipOnboarding: false,
  completed: false,
};

export const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome', description: 'Get started with ARM' },
  { id: 'create-agent', title: 'Create Agent', description: 'Set up your first AI worker' },
  { id: 'configure', title: 'Configure', description: 'Customize your agent' },
  { id: 'complete', title: 'Complete', description: 'You\'re all set!' },
] as const;

export type OnboardingStepId = typeof ONBOARDING_STEPS[number]['id'];
