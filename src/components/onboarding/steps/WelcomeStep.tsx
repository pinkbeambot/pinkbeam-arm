'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Zap, Activity, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { OnboardingStepProps } from '../types';

const FEATURES = [
  { icon: Bot, label: 'AI Agents', description: 'Autonomous workers' },
  { icon: Zap, label: 'Automation', description: 'Streamlined workflows' },
  { icon: Activity, label: 'Monitoring', description: 'Real-time insights' },
] as const;

export function WelcomeStep({ onNext, onSkip }: OnboardingStepProps) {
  return (
    <div className="space-y-6 text-center">
      {/* Hero Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="relative inline-block"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 blur-2xl opacity-20 rounded-full" />
        <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-pink-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-xl">
          <Sparkles className="w-12 h-12 text-white" />
        </div>
      </motion.div>

      {/* Title & Description */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-2"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Welcome to Pink Beam ARM
        </h1>
        <p className="text-muted-foreground max-w-sm mx-auto text-sm sm:text-base">
          Your AI workforce command center. Let&apos;s get you set up with your first agent in just a few steps.
        </p>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-3 gap-3 max-w-sm mx-auto"
      >
        {FEATURES.map((feature, index) => (
          <FeatureCard key={feature.label} {...feature} index={index} />
        ))}
      </motion.div>

      {/* Value Proposition */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="space-y-3 max-w-sm mx-auto"
      >
        <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span>No credit card required</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span>Free tier includes 3 agents</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground justify-center">
          <UserCheck className="w-4 h-4 text-emerald-500" />
          <span>Cancel anytime</span>
        </div>
      </motion.div>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="flex flex-col gap-3 pt-2"
      >
        <Button size="lg" onClick={onNext} className="gap-2 w-full sm:w-auto sm:min-w-[200px]">
          Get Started
          <ArrowRight className="w-4 h-4" />
        </Button>
        {onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            Skip onboarding (experienced users)
          </Button>
        )}
      </motion.div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  label,
  description,
  index,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
    >
      <Card className={cn(
        "flex flex-col items-center gap-2 p-3 sm:p-4 border-border/50",
        "hover:border-primary/50 hover:bg-muted/50 transition-colors"
      )}>
        <Icon className="w-5 h-5 text-pink-500" />
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="text-[10px] text-muted-foreground hidden sm:block">{description}</span>
      </Card>
    </motion.div>
  );
}
