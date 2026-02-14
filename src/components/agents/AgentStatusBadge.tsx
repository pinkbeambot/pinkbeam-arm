"use client";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types";
import {
  Loader2,
  Circle,
  Play,
  Pause,
  AlertTriangle,
  AlertCircle,
  XCircle,
  Ghost,
  type LucideIcon,
} from "lucide-react";

export interface AgentStatusBadgeProps {
  status: AgentStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline" | "subtle";
  showIcon?: boolean;
  showLabel?: boolean;
  pulse?: boolean;
}

/**
 * Agent Status Configuration
 * Maps each status to Tailwind colors and icons
 */
const statusConfig: Record<AgentStatus, {
  icon: LucideIcon;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  iconColor: string;
  animate?: boolean;
}> = {
  initializing: {
    icon: Loader2,
    label: "Initializing",
    description: "Agent is starting up and loading configuration",
    color: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-500/10",
    borderColor: "border-amber-200 dark:border-amber-500/30",
    iconColor: "text-amber-500",
    animate: true,
  },
  idle: {
    icon: Circle,
    label: "Idle",
    description: "Agent is ready but not currently working",
    color: "text-slate-700 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-500/10",
    borderColor: "border-slate-200 dark:border-slate-500/30",
    iconColor: "text-slate-500",
  },
  active: {
    icon: Play,
    label: "Active",
    description: "Agent is currently processing tasks",
    color: "text-emerald-700 dark:text-emerald-400",
    bgColor: "bg-emerald-50 dark:bg-emerald-500/10",
    borderColor: "border-emerald-200 dark:border-emerald-500/30",
    iconColor: "text-emerald-500",
    animate: true,
  },
  paused: {
    icon: Pause,
    label: "Paused",
    description: "Agent execution is temporarily paused",
    color: "text-blue-700 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    borderColor: "border-blue-200 dark:border-blue-500/30",
    iconColor: "text-blue-500",
  },
  blocked: {
    icon: AlertTriangle,
    label: "Blocked",
    description: "Agent is waiting for input or resolution",
    color: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-500/10",
    borderColor: "border-orange-200 dark:border-orange-500/30",
    iconColor: "text-orange-500",
    animate: true,
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    description: "Agent encountered an error",
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-500/10",
    borderColor: "border-red-200 dark:border-red-500/30",
    iconColor: "text-red-500",
  },
  escaped: {
    icon: Ghost,
    label: "Escaped",
    description: "Agent has escaped its constraints (rare)",
    color: "text-purple-700 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-500/10",
    borderColor: "border-purple-200 dark:border-purple-500/30",
    iconColor: "text-purple-500",
    animate: true,
  },
  terminated: {
    icon: XCircle,
    label: "Terminated",
    description: "Agent has been shut down",
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-500/10",
    borderColor: "border-gray-200 dark:border-gray-500/30",
    iconColor: "text-gray-500",
  },
};

const sizeConfig = {
  sm: {
    padding: "px-2 py-0.5",
    gap: "gap-1",
    icon: "h-3 w-3",
    text: "text-xs",
    rounded: "rounded",
  },
  md: {
    padding: "px-2.5 py-1",
    gap: "gap-1.5",
    icon: "h-4 w-4",
    text: "text-sm",
    rounded: "rounded-md",
  },
  lg: {
    padding: "px-3 py-1.5",
    gap: "gap-2",
    icon: "h-5 w-5",
    text: "text-base",
    rounded: "rounded-lg",
  },
};

/**
 * Agent Status Badge Component
 * 
 * A comprehensive badge showing agent status with icon and label.
 * Supports multiple sizes, variants, and optional pulse animation.
 * 
 * @example
 * ```tsx
 * // Default badge
 * <AgentStatusBadge status="active" />
 * 
 * // Outline variant
 * <AgentStatusBadge status="active" variant="outline" />
 * 
 * // Subtle variant (minimal background)
 * <AgentStatusBadge status="idle" variant="subtle" />
 * 
 * // Without icon
 * <AgentStatusBadge status="active" showIcon={false} />
 * 
 * // Icon only
 * <AgentStatusBadge status="active" showLabel={false} />
 * 
 * // With pulse animation
 * <AgentStatusBadge status="active" pulse />
 * ```
 */
export function AgentStatusBadge({
  status,
  className,
  size = "md",
  variant = "default",
  showIcon = true,
  showLabel = true,
  pulse = false,
}: AgentStatusBadgeProps) {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;
  const shouldPulse = pulse && config.animate;

  const variantStyles = {
    default: cn(config.bgColor, config.borderColor, "border"),
    outline: cn("bg-transparent", config.borderColor, "border-2"),
    subtle: cn(config.bgColor, "border-transparent"),
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium",
        sizeStyles.padding,
        sizeStyles.gap,
        sizeStyles.rounded,
        variantStyles[variant],
        className
      )}
      title={config.description}
      role="status"
      aria-label={`Agent status: ${config.label}`}
    >
      {showIcon && (
        <Icon
          className={cn(
            sizeStyles.icon,
            config.iconColor,
            shouldPulse && "animate-spin"
          )}
          aria-hidden="true"
        />
      )}
      {showLabel && (
        <span className={cn(sizeStyles.text, config.color)}>
          {config.label}
        </span>
      )}
    </span>
  );
}

/**
 * Agent Status Badge Group
 * 
 * Shows multiple agents' status counts
 * 
 * @example
 * ```tsx
 * <AgentStatusBadgeGroup
 *   counts={{
 *     active: 5,
 *     idle: 3,
 *     error: 1,
 *   }}
 * />
 * ```
 */
export function AgentStatusBadgeGroup({
  counts,
  className,
  size = "sm",
}: {
  counts: Partial<Record<AgentStatus, number>>;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const entries = Object.entries(counts).filter(([, count]) => count > 0) as [
    AgentStatus,
    number
  ][];

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {entries.map(([status, count]) => (
        <AgentStatusBadge
          key={status}
          status={status}
          size={size}
          variant="subtle"
          className="cursor-default"
        />
      ))}
    </div>
  );
}

/**
 * Agent Status Select
 * 
 * Dropdown for changing agent status (for admin use)
 * 
 * @example
 * ```tsx
 * <AgentStatusSelect
 *   value={status}
 *   onChange={setStatus}
 *   disabled={isUpdating}
 * />
 * ```
 */
export function AgentStatusSelect({
  value,
  onChange,
  disabled = false,
  className,
}: {
  value: AgentStatus;
  onChange: (status: AgentStatus) => void;
  disabled?: boolean;
  className?: string;
}) {
  const statuses: AgentStatus[] = [
    "initializing",
    "idle",
    "active",
    "paused",
    "blocked",
    "error",
    "escaped",
    "terminated",
  ];

  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AgentStatus)}
        disabled={disabled}
        className={cn(
          "appearance-none bg-transparent pr-8 pl-2 py-1 rounded-md",
          "border border-slate-200 dark:border-slate-700",
          "text-sm font-medium",
          "focus:outline-none focus:ring-2 focus:ring-offset-1",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "cursor-pointer"
        )}
      >
        {statuses.map((status) => (
          <option key={status} value={status}>
            {statusConfig[status].label}
          </option>
        ))}
      </select>
      
      {/* Custom display showing current status */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <AgentStatusBadge status={value} size="sm" variant="subtle" />
      </div>
    </div>
  );
}

export default AgentStatusBadge;
