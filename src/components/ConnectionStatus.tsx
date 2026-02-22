"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Loader2 } from "lucide-react";

interface ConnectionStatusProps {
  status: "connected" | "disconnected" | "connecting" | "error";
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

/**
 * Connection Status Indicator
 * 
 * Shows realtime connection state with appropriate icon and color.
 * 
 * @example
 * ```tsx
 * // Default (medium size with label)
 * <ConnectionStatus status="connected" />
 * 
 * // Small icon only
 * <ConnectionStatus status="connecting" size="sm" showLabel={false} />
 * 
 * // In a header
 * <ConnectionStatus 
 *   status={connectionStatus} 
 *   className="ml-auto" 
 * />
 * ```
 */
export function ConnectionStatus({
  status,
  className,
  showLabel = true,
  size = "md",
}: ConnectionStatusProps) {
  const config = {
    connected: {
      icon: Wifi,
      label: "Live",
      variant: "default" as const,
      className: "bg-emerald-500 hover:bg-emerald-500 text-white",
      iconClassName: "text-white",
      animate: false,
    },
    connecting: {
      icon: Loader2,
      label: "Connecting",
      variant: "secondary" as const,
      className: "bg-amber-500 hover:bg-amber-500 text-white",
      iconClassName: "text-white animate-spin",
      animate: true,
    },
    disconnected: {
      icon: WifiOff,
      label: "Offline",
      variant: "outline" as const,
      className: "border-slate-300 text-slate-500",
      iconClassName: "text-slate-500",
      animate: false,
    },
    error: {
      icon: WifiOff,
      label: "Error",
      variant: "destructive" as const,
      className: "",
      iconClassName: "",
      animate: false,
    },
  };

  const { icon: Icon, label, className: badgeClassName, iconClassName } = config[status];

  const sizeClasses = {
    sm: "h-5 px-1.5 text-[10px] gap-1",
    md: "h-6 px-2.5 text-xs gap-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center font-medium border-0",
        sizeClasses[size],
        badgeClassName,
        className
      )}
    >
      <Icon className={cn(iconSizes[size], iconClassName)} />
      {showLabel && <span>{label}</span>}
    </Badge>
  );
}

export default ConnectionStatus;
