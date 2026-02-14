'use client';

/**
 * TaskStatusBadge Component
 * 
 * Displays task status with appropriate styling and animations.
 * Supports different sizes, icon display, and pulse animation for live updates.
 */

import * as React from 'react';
import { 
  Circle, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  Ban
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/types';
import type { TaskStatusBadgeProps } from './types';

// ============================================================================
// Status Configuration
// ============================================================================

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  animate?: boolean;
}

const statusConfig: Record<TaskStatus, StatusConfig> = {
  queued: {
    label: 'Queued',
    icon: Circle,
    color: 'bg-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    borderColor: 'border-slate-300 dark:border-slate-700',
    textColor: 'text-slate-700 dark:text-slate-300',
  },
  in_progress: {
    label: 'In Progress',
    icon: Loader2,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-700 dark:text-blue-300',
    animate: true,
  },
  blocked: {
    label: 'Blocked',
    icon: AlertCircle,
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-300',
  },
  review: {
    label: 'Review',
    icon: Clock,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
    textColor: 'text-amber-700 dark:text-amber-300',
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle2,
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    textColor: 'text-green-700 dark:text-green-300',
  },
  failed: {
    label: 'Failed',
    icon: XCircle,
    color: 'bg-red-600',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-700 dark:text-red-300',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    color: 'bg-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    borderColor: 'border-gray-300 dark:border-gray-700',
    textColor: 'text-gray-700 dark:text-gray-300',
  },
};

// ============================================================================
// Size Configuration
// ============================================================================

const sizeConfig = {
  sm: {
    container: 'px-1.5 py-0.5 gap-1',
    icon: 'w-3 h-3',
    text: 'text-[10px]',
    dot: 'w-1.5 h-1.5',
  },
  md: {
    container: 'px-2 py-0.5 gap-1.5',
    icon: 'w-3.5 h-3.5',
    text: 'text-xs',
    dot: 'w-2 h-2',
  },
  lg: {
    container: 'px-3 py-1 gap-2',
    icon: 'w-4 h-4',
    text: 'text-sm',
    dot: 'w-2.5 h-2.5',
  },
};

// ============================================================================
// Component
// ============================================================================

export function TaskStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  pulse = false,
}: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium transition-all duration-200',
        config.bgColor,
        config.borderColor,
        config.textColor,
        sizeStyles.container,
        pulse && 'ring-2 ring-offset-1',
        pulse && config.color.replace('bg-', 'ring-')
      )}
    >
      {/* Status Dot */}
      <span
        className={cn(
          'rounded-full',
          config.color,
          sizeStyles.dot,
          (config.animate || pulse) && 'animate-pulse'
        )}
      />

      {/* Icon */}
      {showIcon && (
        <Icon
          className={cn(
            sizeStyles.icon,
            config.animate && 'animate-spin',
            config.textColor
          )}
        />
      )}

      {/* Label */}
      <span className={sizeStyles.text}>
        {config.label}
      </span>
    </span>
  );
}

// ============================================================================
// Utility: Get status config for external use
// ============================================================================

export function getTaskStatusConfig(status: TaskStatus): StatusConfig {
  return statusConfig[status];
}

// ============================================================================
// Component: TaskStatusIcon (icon only)
// ============================================================================

export interface TaskStatusIconProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  animate?: boolean;
}

export function TaskStatusIcon({ 
  status, 
  size = 'md', 
  className,
  animate = false,
}: TaskStatusIconProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Icon
      className={cn(
        sizeStyles.icon,
        config.textColor,
        (config.animate || animate) && status === 'in_progress' && 'animate-spin',
        className
      )}
    />
  );
}
