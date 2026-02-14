/**
 * Agent Status Indicator Component
 * 
 * Visual indicator (colored dot/pulse) for agent status.
 * Provides real-time visual feedback on agent state.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';

export interface AgentStatusIndicatorProps {
  status: AgentStatus;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  pulse?: boolean;
  showTooltip?: boolean;
  tooltipText?: string;
}

/**
 * Status color mapping following ARM design system
 */
const statusColors: Record<AgentStatus, string> = {
  initializing: 'bg-blue-500',
  idle: 'bg-amber-500',
  active: 'bg-emerald-500',
  paused: 'bg-slate-400',
  blocked: 'bg-purple-500',
  error: 'bg-rose-500',
  escaped: 'bg-orange-600',
  terminated: 'bg-gray-500',
};

/**
 * Status labels for tooltips
 */
const statusLabels: Record<AgentStatus, string> = {
  initializing: 'Initializing',
  idle: 'Idle',
  active: 'Active',
  paused: 'Paused',
  blocked: 'Blocked',
  error: 'Error',
  escaped: 'Escaped',
  terminated: 'Terminated',
};

/**
 * Status descriptions for enhanced tooltips
 */
const statusDescriptions: Record<AgentStatus, string> = {
  initializing: 'Agent is starting up and loading configuration',
  idle: 'Agent is ready and waiting for tasks',
  active: 'Agent is currently working on a task',
  paused: 'Agent is temporarily paused by user',
  blocked: 'Agent is blocked and waiting for dependencies',
  error: 'Agent encountered an error and needs attention',
  escaped: 'Agent has broken containment - immediate review required',
  terminated: 'Agent has been terminated',
};

/**
 * Determines if a status should have a pulse animation
 */
const shouldPulse = (status: AgentStatus): boolean => {
  return status === 'active' || status === 'initializing';
};

/**
 * Size configurations for the indicator dot
 */
const sizeConfig = {
  sm: {
    dot: 'h-2 w-2',
    ring: 'h-3 w-3',
  },
  md: {
    dot: 'h-2.5 w-2.5',
    ring: 'h-4 w-4',
  },
  lg: {
    dot: 'h-3 w-3',
    ring: 'h-5 w-5',
  },
  xl: {
    dot: 'h-4 w-4',
    ring: 'h-6 w-6',
  },
};

export function AgentStatusIndicator({
  status,
  className,
  size = 'md',
  pulse: forcePulse,
  showTooltip = false,
  tooltipText,
}: AgentStatusIndicatorProps) {
  const colorClass = statusColors[status];
  const sizes = sizeConfig[size];
  const isPulsing = forcePulse ?? shouldPulse(status);
  const label = tooltipText ?? statusLabels[status];
  const description = statusDescriptions[status];

  const indicator = (
    <span
      className={cn(
        'relative inline-flex items-center justify-center',
        className
      )}
      aria-label={`Agent status: ${label}`}
      role="status"
    >
      {/* Pulse ring for active statuses */}
      {isPulsing && (
        <span
          className={cn(
            'absolute inline-flex rounded-full opacity-75 animate-ping',
            colorClass,
            sizes.ring
          )}
        />
      )}
      
      {/* Main status dot */}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          colorClass,
          sizes.dot,
          isPulsing && 'animate-pulse'
        )}
      />
    </span>
  );

  if (showTooltip) {
    return (
      <div className="group relative inline-flex">
        {indicator}
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
          <div className="bg-popover text-popover-foreground rounded-lg shadow-lg border border-border px-3 py-2 whitespace-nowrap">
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
        </div>
      </div>
    );
  }

  return indicator;
}

/**
 * Compact status indicator for dense UIs
 * Shows only the colored dot without pulse animation
 */
export function AgentStatusDot({
  status,
  className,
  size = 'sm',
}: Omit<AgentStatusIndicatorProps, 'pulse' | 'showTooltip' | 'tooltipText'>) {
  const colorClass = statusColors[status];
  const sizes = sizeConfig[size];

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        colorClass,
        sizes.dot,
        className
      )}
      aria-label={`Agent status: ${statusLabels[status]}`}
      role="status"
    />
  );
}

/**
 * Status indicator with animated ring effect
 * Enhanced visual for highlighting status changes
 */
export function AgentStatusRing({
  status,
  className,
  size = 'md',
}: Omit<AgentStatusIndicatorProps, 'pulse' | 'showTooltip' | 'tooltipText'>) {
  const colorClass = statusColors[status];
  const sizes = sizeConfig[size];
  const isPulsing = shouldPulse(status);

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center rounded-full',
        'ring-2 ring-offset-2 ring-offset-background',
        colorClass.replace('bg-', 'ring-'),
        className
      )}
      aria-label={`Agent status: ${statusLabels[status]}`}
      role="status"
    >
      {isPulsing && (
        <span
          className={cn(
            'absolute inline-flex rounded-full opacity-60 animate-ping',
            colorClass,
            sizes.ring
          )}
        />
      )}
      <span
        className={cn(
          'relative inline-flex rounded-full',
          colorClass,
          sizes.dot
        )}
      />
    </span>
  );
}
