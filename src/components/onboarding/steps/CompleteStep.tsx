'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PartyPopper,
  CheckCircle2,
  Sparkles,
  Bot,
  ArrowRight,
  Zap,
  Target,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OnboardingStepProps } from '../types';

const NEXT_ACTIONS = [
  {
    id: 'create-task',
    title: 'Create a Task',
    description: 'Assign work to your new agent',
    icon: Target,
    href: '/portal/tasks',
    color: 'emerald',
  },
  {
    id: 'view-agents',
    title: 'View All Agents',
    description: 'Manage your AI workforce',
    icon: Bot,
    href: '/portal/agents',
    color: 'blue',
  },
  {
    id: 'monitor',
    title: 'Monitor Activity',
    description: 'Watch your agent work in real-time',
    icon: Activity,
    href: '/portal/activity',
    color: 'violet',
  },
  {
    id: 'upgrade',
    title: 'Upgrade Plan',
    description: 'Unlock more agents & features',
    icon: Zap,
    href: '/portal/settings/billing',
    color: 'amber',
  },
] as const;

export function CompleteStep({ onNext, data }: OnboardingStepProps) {
  // eslint-disable-next-line react-hooks/immutability
  const handleAction = (href: string) => {
    window.location.href = href;
  };

  // Generate random offsets once for the animation
  const randomOffsets = useMemo(() => 
    [...Array(8)].map(() => Math.random() * 30), 
    []
  );

  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 10, stiffness: 100 }}
        className="relative inline-block"
      >
        <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-xl">
          <PartyPopper className="w-12 h-12 text-white" />
        </div>

        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
              x: [0, (i - 4) * 35],
              y: [0, -50 - randomOffsets[i], -80],
            }}
            transition={{
              duration: 1.2,
              delay: 0.3 + i * 0.08,
              ease: 'easeOut',
            }}
            className="absolute top-1/2 left-1/2 w-2.5 h-2.5 rounded-full"
            style={{
              backgroundColor: ['#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#14b8a6', '#f97316'][i],
            }}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          You&apos;re All Set!
        </h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Your first AI agent is ready to go. Create tasks, assign work, and watch your productivity soar.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800 max-w-sm mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold">
                {data.agentName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold">{data.agentName}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize text-xs">
                  {data.agentRole}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {data.agentCapabilities.length} capabilities
                </Badge>
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-2 max-w-sm mx-auto"
      >
        <p className="text-sm font-medium text-muted-foreground">Quick start checklist</p>
        <div className="space-y-2">
          <ChecklistItem checked text="Account created" />
          <ChecklistItem checked text="First agent configured" />
          <ChecklistItem text="Assign your first task" />
          <ChecklistItem text="Monitor agent activity" />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-3 max-w-sm mx-auto"
      >
        {NEXT_ACTIONS.map((action, index) => (
          <ActionCard
            key={action.id}
            {...action}
            index={index}
            onClick={() => handleAction(action.href)}
          />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Button size="lg" onClick={onNext} className="gap-2 min-w-[200px]">
          <Sparkles className="w-4 h-4" />
          Start Using ARM
          <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xs text-muted-foreground"
      >
        Need help? Visit our{' '}
        <a href="/docs" className="text-primary hover:underline">
          documentation
        </a>{' '}
        or{' '}
        <a href="/contact" className="text-primary hover:underline">
          contact support
        </a>
      </motion.p>
    </div>
  );
}

function ChecklistItem({ checked, text }: { checked?: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      <div className={cn(
        'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
        checked ? 'bg-emerald-500' : 'bg-muted'
      )}>
        {checked ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        ) : (
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
        )}
      </div>
      <span className={cn(
        'text-sm',
        checked ? 'text-foreground' : 'text-muted-foreground'
      )}>
        {text}
      </span>
    </div>
  );
}

function ActionCard({
  title,
  description,
  icon: Icon,
  color,
  index,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'violet' | 'amber';
  index: number;
  onClick: () => void;
}) {
  const colorClasses = {
    emerald: 'hover:border-emerald-500/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
    blue: 'hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20',
    violet: 'hover:border-violet-500/50 hover:bg-violet-50/50 dark:hover:bg-violet-950/20',
    amber: 'hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-950/20',
  };

  const iconColors = {
    emerald: 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30',
    blue: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    violet: 'text-violet-500 bg-violet-100 dark:bg-violet-900/30',
    amber: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  };

  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 + index * 0.05 }}
      onClick={onClick}
      className={cn(
        'flex flex-col items-start p-3 rounded-lg border border-border bg-card text-left transition-all',
        colorClasses[color]
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', iconColors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="font-medium text-sm">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </motion.button>
  );
}
