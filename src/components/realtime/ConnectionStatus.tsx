/**
 * Connection Status Component
 * 
 * Displays WebSocket connection state with visual indicators.
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { 
  Wifi, 
  WifiOff, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

export type ConnectionState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error';

export interface ConnectionStatusProps {
  state: ConnectionState;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onReconnect?: () => void;
}

const statusConfig = {
  connected: {
    icon: Wifi,
    label: 'Connected',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    dotColor: 'bg-green-500',
  },
  connecting: {
    icon: Loader2,
    label: 'Connecting...',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    dotColor: 'bg-blue-500',
  },
  reconnecting: {
    icon: Loader2,
    label: 'Reconnecting...',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  disconnected: {
    icon: WifiOff,
    label: 'Disconnected',
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20',
    dotColor: 'bg-slate-500',
  },
  error: {
    icon: AlertCircle,
    label: 'Connection Error',
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    dotColor: 'bg-red-500',
  },
};

const sizeConfig = {
  sm: {
    icon: 'h-3 w-3',
    dot: 'h-1.5 w-1.5',
    text: 'text-xs',
    padding: 'px-2 py-1',
    gap: 'gap-1.5',
  },
  md: {
    icon: 'h-4 w-4',
    dot: 'h-2 w-2',
    text: 'text-sm',
    padding: 'px-3 py-1.5',
    gap: 'gap-2',
  },
  lg: {
    icon: 'h-5 w-5',
    dot: 'h-2.5 w-2.5',
    text: 'text-base',
    padding: 'px-4 py-2',
    gap: 'gap-2.5',
  },
};

export function ConnectionStatus({
  state,
  className,
  showLabel = true,
  size = 'md',
  onReconnect,
}: ConnectionStatusProps) {
  const config = statusConfig[state];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const isLoading = state === 'connecting' || state === 'reconnecting';

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
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
          'rounded-full',
          config.dotColor,
          sizeStyles.dot,
          isLoading && 'animate-pulse'
        )}
      />

      {/* Icon */}
      <Icon
        className={cn(
          config.color,
          sizeStyles.icon,
          isLoading && 'animate-spin'
        )}
      />

      {/* Label */}
      {showLabel && (
        <span className={cn('font-medium', config.color, sizeStyles.text)}>
          {config.label}
        </span>
      )}

      {/* Reconnect Button (for error state) */}
      {state === 'error' && onReconnect && (
        <button
          onClick={onReconnect}
          className={cn(
            'ml-1 rounded-md px-2 py-0.5 text-xs font-medium',
            'bg-red-500 text-white hover:bg-red-600',
            'transition-colors'
          )}
        >
          Retry
        </button>
      )}
    </div>
  );
}
