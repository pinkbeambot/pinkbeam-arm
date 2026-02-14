"use client";

import { cn } from "@/lib/utils";
import type { AgentStatus } from "@/types";
import { formatDistanceToNow } from "date-fns";

export interface AgentActivityPulseProps {
  status: AgentStatus;
  lastActiveAt?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showRing?: boolean;
  showLabel?: boolean;
  pulseIntensity?: "subtle" | "normal" | "strong";
}

/**
 * Activity intensity configuration
 */
const intensityConfig = {
  subtle: {
    scale: "scale-105",
    opacity: "opacity-75",
  },
  normal: {
    scale: "scale-110",
    opacity: "opacity-100",
  },
  strong: {
    scale: "scale-125",
    opacity: "opacity-100",
  },
};

/**
 * Status-based pulse configuration
 */
const pulseConfig: Record<AgentStatus, {
  shouldPulse: boolean;
  color: string;
  ringColor: string;
  label?: string;
  intensity: "subtle" | "normal" | "strong";
}> = {
  initializing: {
    shouldPulse: true,
    color: "bg-amber-500",
    ringColor: "ring-amber-500/50",
    label: "Starting up...",
    intensity: "normal",
  },
  idle: {
    shouldPulse: false,
    color: "bg-slate-400",
    ringColor: "ring-slate-400/30",
    label: "Waiting...",
    intensity: "subtle",
  },
  active: {
    shouldPulse: true,
    color: "bg-emerald-500",
    ringColor: "ring-emerald-500/50",
    label: "Working...",
    intensity: "strong",
  },
  paused: {
    shouldPulse: false,
    color: "bg-blue-400",
    ringColor: "ring-blue-400/30",
    label: "Paused",
    intensity: "subtle",
  },
  blocked: {
    shouldPulse: true,
    color: "bg-orange-500",
    ringColor: "ring-orange-500/50",
    label: "Blocked",
    intensity: "normal",
  },
  error: {
    shouldPulse: false,
    color: "bg-red-500",
    ringColor: "ring-red-500/30",
    label: "Error",
    intensity: "subtle",
  },
  escaped: {
    shouldPulse: true,
    color: "bg-pink-500",
    ringColor: "ring-pink-500/50",
    label: "⚠️ Escaped",
    intensity: "strong",
  },
  terminated: {
    shouldPulse: false,
    color: "bg-gray-500",
    ringColor: "ring-gray-500/30",
    label: "Offline",
    intensity: "subtle",
  },
};

const sizeConfig = {
  sm: {
    container: "h-8 w-8",
    core: "h-2 w-2",
    ring: "ring-2",
    text: "text-xs",
  },
  md: {
    container: "h-12 w-12",
    core: "h-3 w-3",
    ring: "ring-2",
    text: "text-sm",
  },
  lg: {
    container: "h-16 w-16",
    core: "h-4 w-4",
    ring: "ring-4",
    text: "text-base",
  },
  xl: {
    container: "h-24 w-24",
    core: "h-6 w-6",
    ring: "ring-4",
    text: "text-lg",
  },
};

/**
 * Agent Activity Pulse Component
 * 
 * A visual pulse animation that indicates agent activity level.
 * Shows concentric rings that animate based on status intensity.
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <AgentActivityPulse status="active" />
 * 
 * // With last active timestamp
 * <AgentActivityPulse status="active" lastActiveAt={agent.last_active_at} />
 * 
 * // Different sizes
 * <AgentActivityPulse status="active" size="lg" />
 * 
 * // Without outer ring
 * <AgentActivityPulse status="active" showRing={false} />
 * 
 * // Custom pulse intensity
 * <AgentActivityPulse status="active" pulseIntensity="strong" />
 * ```
 */
export function AgentActivityPulse({
  status,
  lastActiveAt,
  className,
  size = "md",
  showRing = true,
  showLabel = false,
  pulseIntensity,
}: AgentActivityPulseProps) {
  const config = pulseConfig[status];
  const sizeStyles = sizeConfig[size];
  const intensity = intensityConfig[pulseIntensity || config.intensity];

  const shouldPulse = config.shouldPulse;

  // Format "last active" time
  const lastActiveText = lastActiveAt
    ? `Last active ${formatDistanceToNow(new Date(lastActiveAt), { addSuffix: true })}`
    : null;

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {/* Pulse Container */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          sizeStyles.container
        )}
      >
        {/* Outer ring - animated when pulsing */}
        {showRing && shouldPulse && (
          <>
            <span
              className={cn(
                "absolute inset-0 rounded-full",
                config.ringColor,
                sizeStyles.ring,
                "animate-ping",
                "opacity-20"
              )}
              style={{ animationDuration: "2s" }}
            />
            <span
              className={cn(
                "absolute inset-2 rounded-full",
                config.ringColor,
                sizeStyles.ring,
                "animate-pulse",
                "opacity-40"
              )}
              style={{ animationDuration: "1.5s" }}
            />
          </>
        )}

        {/* Static ring for non-pulsing states */}
        {showRing && !shouldPulse && (
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              config.ringColor,
              sizeStyles.ring,
              "opacity-30"
            )}
          />
        )}

        {/* Core dot */}
        <span
          className={cn(
            "relative rounded-full transition-all duration-300",
            config.color,
            sizeStyles.core,
            shouldPulse && "animate-pulse",
            shouldPulse && intensity.scale
          )}
        />
      </div>

      {/* Status label */}
      {showLabel && (
        <div className="text-center">
          <p className={cn("font-medium text-slate-700 dark:text-slate-300", sizeStyles.text)}>
            {config.label}
          </p>
          {lastActiveText && (
            <p className="text-xs text-slate-500 mt-0.5">
              {lastActiveText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact Activity Indicator
 * 
 * Minimal pulse for use in lists or tables
 * 
 * @example
 * ```tsx
 * <ActivityIndicator status="active" />
 * ```
 */
export function ActivityIndicator({
  status,
  className,
  size = "sm",
}: {
  status: AgentStatus;
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const config = pulseConfig[status];

  const sizes = {
    xs: "h-1.5 w-1.5",
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
  };

  return (
    <span
      className={cn(
        "relative inline-flex",
        className
      )}
    >
      {config.shouldPulse && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping",
            config.color
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full",
          config.color,
          sizes[size],
          config.shouldPulse && "animate-pulse"
        )}
      />
    </span>
  );
}

/**
 * Agent Activity Bar
 * 
 * Horizontal bar showing activity over time
 * 
 * @example
 * ```tsx
 * <AgentActivityBar status="active" progress={75} />
 * ```
 */
export function AgentActivityBar({
  status,
  progress = 0,
  className,
  showLabel = true,
}: {
  status: AgentStatus;
  progress?: number;
  className?: string;
  showLabel?: boolean;
}) {
  const config = pulseConfig[status];
  const clampedProgress = Math.max(0, Math.min(100, progress));

  const statusLabels: Record<AgentStatus, string> = {
    initializing: "Starting",
    idle: "Idle",
    active: "Processing",
    paused: "Paused",
    blocked: "Blocked",
    error: "Error",
    escaped: "⚠️ Escaped",
    terminated: "Offline",
  };

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between mb-1.5">
        {showLabel && (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {statusLabels[status]}
          </span>
        )}
        {status === "active" && (
          <span className="text-xs text-slate-500">
            {Math.round(clampedProgress)}%
          </span>
        )}
      </div>
      
      <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            config.color,
            config.shouldPulse && "animate-pulse"
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Multi-Agent Activity Grid
 * 
 * Shows pulse indicators for multiple agents
 * 
 * @example
 * ```tsx
 * <AgentActivityGrid
 *   agents={[
 *     { id: "1", status: "active" },
 *     { id: "2", status: "idle" },
 *     { id: "3", status: "error" },
 *   ]}
 * />
 * ```
 */
export function AgentActivityGrid({
  agents,
  className,
  size = "sm",
}: {
  agents: { id: string; status: AgentStatus; lastActiveAt?: string | null }[];
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={cn("flex flex-wrap gap-4", className)}>
      {agents.map((agent) => (
        <AgentActivityPulse
          key={agent.id}
          status={agent.status}
          lastActiveAt={agent.lastActiveAt}
          size={size}
          showLabel
        />
      ))}
    </div>
  );
}

export default AgentActivityPulse;
