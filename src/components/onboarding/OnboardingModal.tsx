'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Bot,
  CheckCircle2,
  Sparkles,
  Target,
  Activity,
  X,
  Zap,
  Users,
  Clock,
  ArrowRight,
  PartyPopper,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

// ============================================================================
// Types
// ============================================================================

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
};

// ============================================================================
// Step Configuration
// ============================================================================

const STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Pink Beam ARM',
    description: 'Your AI workforce command center',
    icon: Sparkles,
  },
  {
    id: 'create-agent',
    title: 'Create Your First Agent',
    description: 'Set up an AI worker to handle tasks',
    icon: Bot,
  },
  {
    id: 'assign-task',
    title: 'Assign a Task',
    description: 'Give your agent work to do',
    icon: Target,
  },
  {
    id: 'monitor',
    title: 'Monitor Activity',
    description: 'Track progress in real-time',
    icon: Activity,
  },
  {
    id: 'complete',
    title: "You're Ready!",
    description: 'Your AI workforce is standing by',
    icon: PartyPopper,
  },
];

// ============================================================================
// Welcome Step Component
// ============================================================================

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="relative inline-block">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 blur-2xl opacity-20 rounded-full" />
        <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-pink-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          Welcome to Pink Beam ARM
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your AI workforce command center. Let&apos;s get you set up with your first agent in just a few steps.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto pt-4">
        <FeatureCard icon={Bot} label="AI Agents" />
        <FeatureCard icon={Zap} label="Automation" />
        <FeatureCard icon={Activity} label="Monitoring" />
      </div>

      <Button size="lg" onClick={onNext} className="gap-2">
        Get Started
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function FeatureCard({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
      <Icon className="w-5 h-5 text-pink-500" />
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

// ============================================================================
// Create Agent Step Component
// ============================================================================

function CreateAgentStep({ onNext, onNavigate }: { onNext: () => void; onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4">
          <Bot className="w-8 h-8 text-blue-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Create Your First Agent</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Agents are AI workers that can handle tasks, make decisions, and collaborate with each other.
        </p>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">Example: Customer Support Agent</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Handles customer inquiries, resolves common issues, and escalates complex problems.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground">Example: Data Analyst</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Processes reports, identifies trends, and generates insights from your data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3">
        <Button onClick={() => onNavigate('/portal/agents')} className="w-full gap-2">
          <Bot className="w-4 h-4" />
          Create Your First Agent
        </Button>
        <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
          I&apos;ll do this later
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Assign Task Step Component
// ============================================================================

function AssignTaskStep({ onNext, onNavigate }: { onNext: () => void; onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-4">
          <Target className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Assign a Task</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Tasks are the work units your agents process. You can assign them manually or let agents self-assign.
        </p>
      </div>

      <div className="space-y-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center">
                <span className="text-xs font-bold text-pink-500">1</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Create a task</p>
                <p className="text-xs text-muted-foreground">Define what needs to be done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                <span className="text-xs font-bold text-violet-500">2</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Assign to an agent</p>
                <p className="text-xs text-muted-foreground">Choose the right AI worker</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-500">3</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Track progress</p>
                <p className="text-xs text-muted-foreground">Monitor in real-time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={() => onNavigate('/portal/tasks')} className="w-full gap-2">
          <Target className="w-4 h-4" />
          Create a Task
        </Button>
        <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
          I&apos;ll do this later
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Monitor Step Component
// ============================================================================

function MonitorStep({ onNext, onNavigate }: { onNext: () => void; onNavigate: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 mx-auto bg-violet-500/10 rounded-2xl flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-violet-500" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Monitor Activity</h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          Keep track of your AI workforce with real-time activity feeds and performance metrics.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MonitorCard 
          icon={Activity} 
          title="Activity Feed"
          description="Real-time updates"
          color="violet"
        />
        <MonitorCard 
          icon={Clock} 
          title="Performance"
          description="Metrics & analytics"
          color="blue"
        />
        <MonitorCard 
          icon={Users} 
          title="Agent Roster"
          description="Manage your team"
          color="emerald"
        />
        <MonitorCard 
          icon={Zap} 
          title="Escalations"
          description="Handle issues"
          color="amber"
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button onClick={() => onNavigate('/portal/activity')} className="w-full gap-2">
          <Activity className="w-4 h-4" />
          View Activity Feed
        </Button>
        <Button variant="ghost" onClick={onNext} className="text-muted-foreground">
          Continue
        </Button>
      </div>
    </div>
  );
}

function MonitorCard({ 
  icon: Icon, 
  title, 
  description, 
  color 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
  color: 'violet' | 'blue' | 'emerald' | 'amber';
}) {
  const colorClasses = {
    violet: 'bg-violet-500/10 text-violet-500',
    blue: 'bg-blue-500/10 text-blue-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
  };

  return (
    <Card className="border-muted">
      <CardContent className="p-4">
        <div className={`w-8 h-8 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Complete Step Component
// ============================================================================

function CompleteStep({ onComplete }: { onComplete: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="relative inline-block">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10, stiffness: 100 }}
          className="relative w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl"
        >
          <PartyPopper className="w-12 h-12 text-white" />
        </motion.div>
        
        {/* Confetti effect */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
              x: [0, (i - 3) * 40],
              y: [0, -60, -100],
            }}
            transition={{ 
              duration: 1,
              delay: 0.2 + i * 0.1,
              ease: 'easeOut'
            }}
            className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444'][i]
            }}
          />
        ))}
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          You&apos;re All Set!
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your AI workforce is ready to go. Create agents, assign tasks, and watch your productivity soar.
        </p>
      </div>

      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Quick start guide complete</span>
        </div>
        <Button size="lg" onClick={onComplete} className="w-full gap-2">
          <Sparkles className="w-4 h-4" />
          Start Using ARM
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Onboarding Modal Component
// ============================================================================

export function OnboardingModal({ isOpen, onComplete, onSkip }: OnboardingModalProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);

  const handleNext = React.useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleNavigate = React.useCallback((path: string) => {
    // Complete onboarding before navigating
    onComplete();
    router.push(path);
  }, [onComplete, router]);

  const handleComplete = React.useCallback(async () => {
    await onComplete();
  }, [onComplete]);

  const handleSkip = React.useCallback(() => {
    onSkip();
  }, [onSkip]);

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const step = STEPS[currentStep];

  // Don't render if not open
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
            className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl border overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <step.icon className="w-5 h-5 text-pink-500" />
                  <span className="font-medium text-sm">
                    Step {currentStep + 1} of {STEPS.length}
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

            {/* Progress Bar */}
            <div className="px-6 pt-4">
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentStep === 0 && <WelcomeStep onNext={handleNext} />}
                  {currentStep === 1 && <CreateAgentStep onNext={handleNext} onNavigate={handleNavigate} />}
                  {currentStep === 2 && <AssignTaskStep onNext={handleNext} onNavigate={handleNavigate} />}
                  {currentStep === 3 && <MonitorStep onNext={handleNext} onNavigate={handleNavigate} />}
                  {currentStep === 4 && <CompleteStep onComplete={handleComplete} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t flex items-center justify-between">
              <button
                onClick={handleSkip}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip tour
              </button>
              
              {currentStep > 0 && currentStep < STEPS.length - 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default OnboardingModal;
