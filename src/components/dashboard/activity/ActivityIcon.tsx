'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Circle,
  AlertCircle,
  AlertTriangle,
  Brain,
  FileText,
  UserPlus,
  UserX,
  MessageSquare,
  Zap,
  XCircle,
  Play,
  Flag,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActivityEventType } from './types';

// ============================================================================
// Activity Icon Configuration
// ============================================================================

type IconConfig = {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  ringColor: string;
};

const iconConfig: Record<ActivityEventType, IconConfig> = {
  // Task events
  task_created: {
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
  },
  task_started: {
    icon: Play,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    ringColor: 'ring-blue-500/30',
  },
  task_completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    ringColor: 'ring-green-500/30',
  },
  task_failed: {
    icon: XCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    ringColor: 'ring-red-500/30',
  },
  
  // Decision events
  decision_made: {
    icon: Brain,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    ringColor: 'ring-amber-500/30',
  },
  
  // Escalation events
  escalation_created: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    ringColor: 'ring-red-500/30',
  },
  escalation_resolved: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    ringColor: 'ring-green-500/30',
  },
  
  // Agent events
  agent_spawned: {
    icon: UserPlus,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    ringColor: 'ring-pink-500/30',
  },
  agent_terminated: {
    icon: UserX,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    ringColor: 'ring-gray-500/30',
  },
};

// ============================================================================
// Props Interface
// ============================================================================

interface ActivityIconProps {
  type: ActivityEventType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  pulse?: boolean;
}

// ============================================================================
// Size Configurations
// ============================================================================

const sizeConfig = {
  sm: {
    container: 'w-7 h-7',
    icon: 'w-3.5 h-3.5',
    ring: 'ring-1',
  },
  md: {
    container: 'w-9 h-9',
    icon: 'w-4.5 h-4.5',
    ring: 'ring-2',
  },
  lg: {
    container: 'w-11 h-11',
    icon: 'w-5 h-5',
    ring: 'ring-2',
  },
};

// ============================================================================
// Activity Icon Component
// ============================================================================

export function ActivityIcon({
  type,
  size = 'md',
  className,
  pulse = false,
}: ActivityIconProps) {
  const config = iconConfig[type];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full',
        config.bgColor,
        config.color,
        sizes.container,
        sizes.ring,
        'ring-offset-2 ring-offset-background',
        config.ringColor,
        pulse && 'animate-pulse-subtle',
        className
      )}
    >
      <Icon className={sizes.icon} />
    </div>
  );
}

// ============================================================================
// Activity Type Badge
// ============================================================================

interface ActivityTypeBadgeProps {
  type: ActivityEventType;
  className?: string;
}

const typeLabels: Record<ActivityEventType, string> = {
  task_created: 'Task',
  task_started: 'Task',
  task_completed: 'Task',
  task_failed: 'Task',
  decision_made: 'Decision',
  escalation_created: 'Escalation',
  escalation_resolved: 'Escalation',
  agent_spawned: 'Agent',
  agent_terminated: 'Agent',
};

export function ActivityTypeBadge({ type, className }: ActivityTypeBadgeProps) {
  const config = iconConfig[type];
  const label = typeLabels[type];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
        config.bgColor,
        config.color,
        className
      )}
    >
      <config.icon className="w-3 h-3" />
      {label}
    </span>
  );
}

// ============================================================================
// Activity Category Badge
// ============================================================================

interface ActivityCategoryBadgeProps {
  category: 'tasks' | 'decisions' | 'escalations' | 'agents' | 'system';
  className?: string;
}

const categoryConfig: Record<ActivityCategoryBadgeProps['category'], { label: string; className: string }> = {
  tasks: {
    label: 'Tasks',
    className: 'bg-blue-500/10 text-blue-600',
  },
  decisions: {
    label: 'Decisions',
    className: 'bg-amber-500/10 text-amber-600',
  },
  escalations: {
    label: 'Escalations',
    className: 'bg-red-500/10 text-red-600',
  },
  agents: {
    label: 'Agents',
    className: 'bg-pink-500/10 text-pink-600',
  },
  system: {
    label: 'System',
    className: 'bg-gray-500/10 text-gray-600',
  },
};

export function ActivityCategoryBadge({ category, className }: ActivityCategoryBadgeProps) {
  const config = categoryConfig[category];
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
