"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  WebSocketManager,
  ConnectionState,
  WSMessage,
  WebSocketConfig,
} from "@/lib/websocket/websocket";

export interface UseWebSocketOptions extends Partial<Omit<WebSocketConfig, 'url'>> {
  url?: string;
  autoConnect?: boolean;
  onMessage?: (message: WSMessage) => void;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
}

export interface UseWebSocketReturn {
  state: ConnectionState;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  send: <T>(message: WSMessage<T>) => boolean;
  subscribe: <T>(topic: string, handler: (message: WSMessage<T>) => void) => () => void;
}

/**
 * React hook for WebSocket connection management
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, isConnected, send, subscribe } = useWebSocket({
 *     url: 'wss://api.example.com/socket',
 *     autoConnect: true,
 *   });
 * 
 *   useEffect(() => {
 *     if (isConnected) {
 *       const unsubscribe = subscribe('notifications', (msg) => {
 *         console.log('Notification:', msg);
 *       });
 *       return unsubscribe;
 *     }
 *   }, [isConnected, subscribe]);
 * 
 *   return <div>Status: {state}</div>;
 * }
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    autoConnect = true,
    onMessage,
    onStateChange,
    onError,
    ...config
  } = options;

  const wsRef = useRef<WebSocketManager | null>(null);
  const [state, setState] = useState<ConnectionState>("disconnected");

  // Initialize WebSocket manager
  useEffect(() => {
    const ws = new WebSocketManager({
      url: config.url || "",
      reconnectAttempts: config.reconnectAttempts,
      reconnectInterval: config.reconnectInterval,
      maxReconnectInterval: config.maxReconnectInterval,
      heartbeatInterval: config.heartbeatInterval,
      heartbeatTimeout: config.heartbeatTimeout,
      backoffMultiplier: config.backoffMultiplier,
      debug: config.debug,
    });

    wsRef.current = ws;

    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      ws.onStateChange((newState: ConnectionState) => {
        setState(newState);
        onStateChange?.(newState);
      })
    );

    if (onMessage) {
      unsubscribers.push(ws.onMessage(onMessage));
    }

    if (onError) {
      unsubscribers.push(ws.onError(onError));
    }

    if (autoConnect && config.url) {
      ws.connect();
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      ws.destroy();
      wsRef.current = null;
    };
  }, [config.url]);

  const connect = useCallback(() => {
    wsRef.current?.connect();
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.disconnect();
  }, []);

  const send = useCallback(<T>(message: WSMessage<T>): boolean => {
    return wsRef.current?.send(message) ?? false;
  }, []);

  const subscribe = useCallback(<T>(
    topic: string,
    handler: (message: WSMessage<T>) => void
  ): (() => void) => {
    return wsRef.current?.subscribe(topic, handler) ?? (() => {});
  }, []);

  return {
    state,
    isConnected: state === "connected",
    connect,
    disconnect,
    send,
    subscribe,
  };
}
