'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Settings, ChevronRight, ChevronLeft, Bell, Shield, Zap, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import type { OnboardingStepProps } from '../types';

interface ConfigOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  defaultValue: boolean;
}

const CONFIG_OPTIONS: ConfigOption[] = [
  {
    id: 'auto_accept_tasks',
    label: 'Auto-accept Tasks',
    description: 'Agent automatically accepts tasks it is capable of handling',
    icon: CheckCircle2,
    defaultValue: true,
  },
  {
    id: 'escalate_on_error',
    label: 'Auto-escalate Errors',
    description: 'Automatically escalate to humans when errors occur',
    icon: Shield,
    defaultValue: true,
  },
  {
    id: 'notifications',
    label: 'Enable Notifications',
    description: 'Receive alerts when your agent needs attention',
    icon: Bell,
    defaultValue: true,
  },
  {
    id: 'verbose_logging',
    label: 'Verbose Logging',
    description: 'Detailed activity logs for debugging and monitoring',
    icon: Zap,
    defaultValue: false,
  },
];

export function ConfigureStep({ onNext, onBack, data, onUpdateData }: OnboardingStepProps) {
  const [config, setConfig] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    CONFIG_OPTIONS.forEach(opt => {
      initial[opt.id] = opt.defaultValue;
    });
    return initial;
  });
  const [confidenceThreshold, setConfidenceThreshold] = React.useState(75);
  const [timeoutMinutes, setTimeoutMinutes] = React.useState(30);

  const handleToggle = (id: string) => {
    setConfig(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNext = () => {
    onUpdateData({ step: 3 });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-12 h-12 mx-auto bg-primary/10 rounded-xl flex items-center justify-center"
        >
          <Settings className="w-6 h-6 text-primary" />
        </motion.div>
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-semibold"
        >
          Quick Configuration
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-muted-foreground"
        >
          Set your agent&apos;s default behavior
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="p-4 bg-muted/50 border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {data.agentName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{data.agentName || 'Unnamed Agent'}</p>
              <p className="text-xs text-muted-foreground capitalize">{data.agentRole} • {data.agentModel}</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        {CONFIG_OPTIONS.map((option, index) => {
          const Icon = option.icon;
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className={cn(
                'flex items-center justify-between p-3 rounded-lg border transition-colors',
                config[option.id] ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  config[option.id] ? 'bg-primary/10' : 'bg-muted'
                )}>
                  <Icon className={cn(
                    'w-4 h-4',
                    config[option.id] ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.description}</p>
                </div>
              </div>
              <Switch
                checked={config[option.id]}
                onCheckedChange={() => handleToggle(option.id)}
              />
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="space-y-4 pt-2"
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Task Timeout
              </Label>
              <span className="text-sm font-medium">{timeoutMinutes} min</span>
            </div>
            <Slider
              value={[timeoutMinutes]}
              onValueChange={([v]) => setTimeoutMinutes(v)}
              min={5}
              max={120}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Agents will escalate tasks that take longer than this
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-muted-foreground" />
                Confidence Threshold
              </Label>
              <span className="text-sm font-medium">{confidenceThreshold}%</span>
            </div>
            <Slider
              value={[confidenceThreshold]}
              onValueChange={([v]) => setConfidenceThreshold(v)}
              min={50}
              max={95}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Agents will escalate when confidence is below this threshold
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex gap-3 pt-2"
      >
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleNext} className="flex-1">
          Create Agent
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
