'use client';

/**
 * Realtime Provider
 * 
 * Provides app-wide Realtime connection state and utilities.
 * Manages the global Supabase Realtime connection status.
 * 
 * @example
 * ```tsx
 * // In layout.tsx
 * <RealtimeProvider>
 *   {children}
 * </RealtimeProvider>
 * 
 * // In any component
 * const { isConnected, connectionState, lastError } = useRealtimeContext();
 * ```
 */

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { ConnectionState } from './useRealtime';

// ============================================================================
// Types
// ============================================================================

export interface RealtimeContextValue {
  /** Current global connection state */
  connectionState: ConnectionState;
  
  /** Whether connected to Realtime */
  isConnected: boolean;
  
  /** Whether connection is in progress */
  isConnecting: boolean;
  
  /** Last connection error */
  lastError: Error | null;
  
  /** Number of reconnection attempts */
  retryCount: number;
  
  /** Last successful connection time */
  lastConnectedAt: Date | null;
  
  /** Manually reconnect */
  reconnect: () => void;
  
  /** Register a channel for tracking */
  registerChannel: (id: string, channel: RealtimeChannel) => void;
  
  /** Unregister a channel */
  unregisterChannel: (id: string) => void;
  
  /** Get count of active channels */
  activeChannelCount: number;
}

interface RealtimeProviderProps {
  children: React.ReactNode;
  /** Enable connection monitoring (default: true) */
  enabled?: boolean;
  /** Health check interval in ms (default: 30000) */
  healthCheckInterval?: number;
}

// ============================================================================
// Context
// ============================================================================

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtimeContext must be used within RealtimeProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export function RealtimeProvider({ 
  children, 
  enabled = true,
  healthCheckInterval = 30000,
}: RealtimeProviderProps) {
  const supabase = createClient();
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatChannelRef = useRef<RealtimeChannel | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [lastError, setLastError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastConnectedAt, setLastConnectedAt] = useState<Date | null>(null);

  // ============================================================================
  // Channel Management
  // ============================================================================

  const registerChannel = useCallback((id: string, channel: RealtimeChannel) => {
    channelsRef.current.set(id, channel);
  }, []);

  const unregisterChannel = useCallback((id: string) => {
    const channel = channelsRef.current.get(id);
    if (channel) {
      channel.unsubscribe();
      channelsRef.current.delete(id);
    }
  }, []);

  // ============================================================================
  // Connection Health Check
  // ============================================================================

  const performHealthCheck = useCallback(async () => {
    if (!enabled || !heartbeatChannelRef.current) return;

    try {
      // Send a heartbeat and wait for response
      const startTime = Date.now();
      
      // Simple presence check
      const status = heartbeatChannelRef.current.subTopic;
      
      // If we're here, the channel is technically "present"
      // But we want to verify actual connectivity
      const currentState = connectionState;
      
      if (currentState !== 'connected' && currentState !== 'connecting') {
        // Connection may be stale, trigger reconnect
        reconnect();
      }
    } catch (err) {
      // Health check failed
      setLastError(err instanceof Error ? err : new Error('Health check failed'));
    }
  }, [enabled, connectionState]);

  // ============================================================================
  // Connection Management
  // ============================================================================

  const setupHeartbeatChannel = useCallback(() => {
    // Create a dedicated heartbeat channel
    const channel = supabase.channel('heartbeat');
    
    channel.subscribe((status) => {
      switch (status) {
        case 'SUBSCRIBED':
          setConnectionState('connected');
          setLastConnectedAt(new Date());
          setRetryCount(0);
          setLastError(null);
          break;
        case 'CLOSED':
          setConnectionState('disconnected');
          break;
        case 'CHANNEL_ERROR':
          setConnectionState('error');
          setLastError(new Error('Heartbeat channel error'));
          break;
        case 'TIMED_OUT':
          setConnectionState('error');
          setLastError(new Error('Heartbeat channel timeout'));
          break;
      }
    });

    heartbeatChannelRef.current = channel;
  }, [supabase]);

  const cleanupHeartbeatChannel = useCallback(() => {
    if (heartbeatChannelRef.current) {
      supabase.removeChannel(heartbeatChannelRef.current);
      heartbeatChannelRef.current = null;
    }
  }, [supabase]);

  const reconnect = useCallback(() => {
    setRetryCount(prev => prev + 1);
    cleanupHeartbeatChannel();
    setupHeartbeatChannel();
  }, [cleanupHeartbeatChannel, setupHeartbeatChannel]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Setup initial connection
  useEffect(() => {
    if (!enabled) {
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');
    setupHeartbeatChannel();

    return () => {
      cleanupHeartbeatChannel();
    };
  }, [enabled, setupHeartbeatChannel, cleanupHeartbeatChannel]);

  // Health check interval
  useEffect(() => {
    if (!enabled || connectionState !== 'connected') {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
        healthCheckRef.current = null;
      }
      return;
    }

    healthCheckRef.current = setInterval(performHealthCheck, healthCheckInterval);

    return () => {
      if (healthCheckRef.current) {
        clearInterval(healthCheckRef.current);
      }
    };
  }, [enabled, connectionState, healthCheckInterval, performHealthCheck]);

  // Cleanup all channels on unmount
  useEffect(() => {
    return () => {
      cleanupHeartbeatChannel();
      channelsRef.current.forEach((channel) => {
        channel.unsubscribe();
      });
      channelsRef.current.clear();
    };
  }, [cleanupHeartbeatChannel]);

  // ============================================================================
  // Value
  // ============================================================================

  const value: RealtimeContextValue = {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting' || connectionState === 'reconnecting',
    lastError,
    retryCount,
    lastConnectedAt,
    reconnect,
    registerChannel,
    unregisterChannel,
    activeChannelCount: channelsRef.current.size,
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export default RealtimeProvider;
