"use client";

import { cn } from "@/lib/utils";
import { ConnectionState } from "@/lib/realtime/websocket";
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertCircle 
} from "lucide-react";

export interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  onReconnect?: () => void;
}

const statusConfig = {
  connected: {
    icon: Wifi,
    label: "Connected",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/20",
    dotColor: "bg-green-500",
  },
  connecting: {
    icon: Loader2,
    label: "Connecting...",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
    dotColor: "bg-blue-500",
  },
  reconnecting: {
    icon: Loader2,
    label: "Reconnecting...",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    dotColor: "bg-amber-500",
  },
  disconnected: {
    icon: WifiOff,
    label: "Disconnected",
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-500/20",
    dotColor: "bg-slate-500",
  },
  error: {
    icon: AlertCircle,
    label: "Connection Error",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    dotColor: "bg-red-500",
  },
};

const sizeConfig = {
  sm: {
    icon: "h-3 w-3",
    dot: "h-1.5 w-1.5",
    text: "text-xs",
    padding: "px-2 py-1",
    gap: "gap-1.5",
  },
  md: {
    icon: "h-4 w-4",
    dot: "h-2 w-2",
    text: "text-sm",
    padding: "px-3 py-1.5",
    gap: "gap-2",
  },
  lg: {
    icon: "h-5 w-5",
    dot: "h-2.5 w-2.5",
    text: "text-base",
    padding: "px-4 py-2",
    gap: "gap-2.5",
  },
};

/**
 * Connection Status Indicator Component
 * 
 * Displays the current WebSocket connection state with appropriate
 * icon, color, and optional label.
 * 
 * @example
 * ```tsx
 * function Header() {
 *   const { state } = useWebSocket({ url: 'wss://api.example.com' });
 *   
 *   return (
 *     <header className="flex items-center justify-between">
 *       <h1>My App</h1>
 *       <ConnectionStatus state={state} showLabel />
 *     </header>
 *   );
 * }
 * ```
 */
export function ConnectionStatus({
  state,
  className,
  showLabel = true,
  size = "md",
  onReconnect,
}: ConnectionStatusProps) {
  const config = statusConfig[state];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const isLoading = state === "connecting" || state === "reconnecting";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border",
        config.bgColor,
        config.borderColor,
        sizeStyles.padding,
        sizeStyles.gap,
        className
      )}
    >
      {/* Status Dot */}
      <span
        className={cn(
          "rounded-full",
          config.dotColor,
          sizeStyles.dot,
          isLoading && "animate-pulse"
        )}
      />

      {/* Icon */}
      <Icon
        className={cn(
          config.color,
          sizeStyles.icon,
          isLoading && "animate-spin"
        )}
      />

      {/* Label */}
      {showLabel && (
        <span className={cn("font-medium", config.color, sizeStyles.text)}>
          {config.label}
        </span>
      )}

      {/* Reconnect Button (for error state) */}
      {state === "error" && onReconnect && (
        <button
          onClick={onReconnect}
          className={cn(
            "ml-1 rounded-md px-2 py-0.5 text-xs font-medium",
            "bg-red-500 text-white hover:bg-red-600",
            "transition-colors"
          )}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Compact Connection Status (dot only)
 * 
 * Use when space is limited or in headers
 * 
 * @example
 * ```tsx
 * <ConnectionDot state={state} />
 * ```
 */
export function ConnectionDot({
  state,
  className,
  size = "md",
}: {
  state: ConnectionState;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const config = statusConfig[state];
  const isLoading = state === "connecting" || state === "reconnecting";

  const sizeStyles = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  };

  return (
    <span
      className={cn(
        "rounded-full inline-block",
        config.dotColor,
        sizeStyles[size],
        isLoading && "animate-pulse",
        className
      )}
      title={config.label}
    />
  );
}

/**
 * Connection Status Badge with Tooltip
 * 
 * Shows full status info on hover
 * 
 * @example
 * ```tsx
 * <ConnectionBadge state={state} />
 * ```
 */
export function ConnectionBadge({
  state,
  className,
  onReconnect,
}: {
  state: ConnectionState;
  className?: string;
  onReconnect?: () => void;
}) {
  const config = statusConfig[state];
  const Icon = config.icon;
  const isLoading = state === "connecting" || state === "reconnecting";

  return (
    <div
      className={cn(
        "group relative inline-flex items-center gap-2",
        "rounded-lg border px-3 py-2",
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          config.color,
          isLoading && "animate-spin"
        )}
      />
      <span className={cn("text-sm font-medium", config.color)}>
        {config.label}
      </span>

      {/* Tooltip */}
      <div
        className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 mb-2",
          "hidden group-hover:block",
          "rounded-md bg-slate-900 px-2 py-1 text-xs text-white",
          "whitespace-nowrap z-50"
        )}
      >
        {state === "connected" && "Real-time updates active"}
        {state === "connecting" && "Establishing connection..."}
        {state === "reconnecting" && "Attempting to reconnect..."}
        {state === "disconnected" && "Click to connect"}
        {state === "error" && "Connection failed"}
      </div>

      {state === "error" && onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-2 rounded bg-red-500 px-2 py-0.5 text-xs text-white hover:bg-red-600"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Connection Status Bar (full width)
 * 
 * Use at the top of pages or in app-level layouts
 * 
 * @example
 * ```tsx
 * function Layout({ children }) {
 *   const { state, connect } = useGlobalWebSocket({ url: WS_URL });
 *   
 *   return (
 *     <div>
 *       <ConnectionBar state={state} onReconnect={connect} />
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function ConnectionBar({
  state,
  onReconnect,
  className,
}: {
  state: ConnectionState;
  onReconnect?: () => void;
  className?: string;
}) {
  const config = statusConfig[state];
  const Icon = config.icon;
  const isLoading = state === "connecting" || state === "reconnecting";

  if (state === "connected") {
    return null; // Don't show bar when connected
  }

  return (
    <div
      className={cn(
        "w-full px-4 py-2",
        "flex items-center justify-center gap-2",
        config.bgColor,
        className
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          config.color,
          isLoading && "animate-spin"
        )}
      />
      <span className={cn("text-sm font-medium", config.color)}>
        {config.label}
      </span>
      {state === "error" && onReconnect && (
        <button
          onClick={onReconnect}
          className={cn(
            "ml-2 rounded px-3 py-1 text-xs font-medium",
            "bg-slate-900 text-white hover:bg-slate-800",
            "transition-colors"
          )}
        >
          Reconnect
        </button>
      )}
    </div>
  );
}
