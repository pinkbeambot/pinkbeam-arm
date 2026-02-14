"use client";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types";

export interface AgentStatusDotProps {
  status: AgentStatus;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  pulse?: boolean;
  showTooltip?: boolean;
}

/**
 * Agent Status Color Configuration
 * Maps each status to Tailwind color classes
 */
const statusConfig: Record<AgentStatus, {
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  description: string;
  animate?: boolean;
}> = {
  initializing: {
    color: "text-amber-500",
    bgColor: "bg-amber-500",
    borderColor: "border-amber-500/30",
    label: "Initializing",
    description: "Agent is starting up and loading configuration",
    animate: true,
  },
  idle: {
    color: "text-slate-500",
    bgColor: "bg-slate-500",
    borderColor: "border-slate-500/30",
    label: "Idle",
    description: "Agent is ready but not currently working",
  },
  active: {
    color: "text-emerald-500",
    bgColor: "bg-emerald-500",
    borderColor: "border-emerald-500/30",
    label: "Active",
    description: "Agent is currently processing tasks",
    animate: true,
  },
  paused: {
    color: "text-blue-500",
    bgColor: "bg-blue-500",
    borderColor: "border-blue-500/30",
    label: "Paused",
    description: "Agent execution is temporarily paused",
  },
  blocked: {
    color: "text-orange-500",
    bgColor: "bg-orange-500",
    borderColor: "border-orange-500/30",
    label: "Blocked",
    description: "Agent is waiting for input or resolution",
    animate: true,
  },
  error: {
    color: "text-red-500",
    bgColor: "bg-red-500",
    borderColor: "border-red-500/30",
    label: "Error",
    description: "Agent encountered an error",
  },
  escaped: {
    color: "text-purple-500",
    bgColor: "bg-purple-500",
    borderColor: "border-purple-500/30",
    label: "Escaped",
    description: "Agent has escaped its constraints (rare)",
    animate: true,
  },
  terminated: {
    color: "text-gray-700",
    bgColor: "bg-gray-700",
    borderColor: "border-gray-700/30",
    label: "Terminated",
    description: "Agent has been shut down",
  },
};

const sizeConfig = {
  xs: {
    dot: "h-1.5 w-1.5",
    border: "border",
  },
  sm: {
    dot: "h-2 w-2",
    border: "border",
  },
  md: {
    dot: "h-2.5 w-2.5",
    border: "border-2",
  },
  lg: {
    dot: "h-3 w-3",
    border: "border-2",
  },
};

/**
 * Agent Status Dot Component
 * 
 * A simple colored dot indicator showing agent status.
 * Supports multiple sizes and optional pulse animation.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AgentStatusDot status="active" />
 * 
 * // With pulse animation for active states
 * <AgentStatusDot status="active" pulse />
 * 
 * // Different sizes
 * <AgentStatusDot status="idle" size="sm" />
 * <AgentStatusDot status="active" size="lg" />
 * 
 * // With tooltip on hover
 * <AgentStatusDot status="blocked" showTooltip />
 * ```
 */
export function AgentStatusDot({
  status,
  className,
  size = "md",
  pulse = false,
  showTooltip = false,
}: AgentStatusDotProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const shouldPulse = pulse && config.animate;

  const dot = (
    <span
      className={cn(
        "inline-block rounded-full",
        config.bgColor,
        sizeStyles.dot,
        sizeStyles.border,
        config.borderColor,
        shouldPulse && "animate-pulse",
        className
      )}
      aria-label={`Status: ${config.label}`}
      role="status"
    />
  );

  if (!showTooltip) {
    return dot;
  }

  return (
    <div className="group relative inline-flex">
      {dot}
      
      {/* Tooltip */}
      <div
        className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
          "hidden group-hover:block",
          "rounded-lg bg-slate-900 px-3 py-2 text-white",
          "whitespace-nowrap z-50 shadow-lg",
          "pointer-events-none"
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", config.bgColor)} />
          <span className="font-medium text-sm">{config.label}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px] whitespace-normal">
          {config.description}
        </p>
        
        {/* Arrow */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
          <div className="border-4 border-transparent border-t-slate-900" />
        </div>
      </div>
    </div>
  );
}

/**
 * Agent Status Dot with Label
 * 
 * Shows the dot alongside the status text label
 * 
 * @example
 * ```tsx
 * <AgentStatusDotWithLabel status="active" />
 * ```
 */
export function AgentStatusDotWithLabel({
  status,
  className,
  size = "md",
  pulse = false,
}: Omit<AgentStatusDotProps, "showTooltip"> & { className?: string }) {
  const config = statusConfig[status];

  const textSizes = {
    xs: "text-xs",
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <AgentStatusDot status={status} size={size} pulse={pulse} />
      <span className={cn("font-medium", textSizes[size], config.color)}>
        {config.label}
      </span>
    </div>
  );
}

/**
 * Compact Status Indicator for Lists
 * 
 * Minimal dot with title attribute for accessibility
 * 
 * @example
 * ```tsx
 * <AgentStatusCompact status="active" />
 * ```
 */
export function AgentStatusCompact({
  status,
  className,
  pulse = false,
}: {
  status: AgentStatus;
  className?: string;
  pulse?: boolean;
}) {
  const config = statusConfig[status];
  const shouldPulse = pulse && config.animate;

  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        config.bgColor,
        shouldPulse && "animate-pulse",
        className
      )}
      title={`${config.label}: ${config.description}`}
      aria-label={`Status: ${config.label}`}
    />
  );
}

export default AgentStatusDot;
