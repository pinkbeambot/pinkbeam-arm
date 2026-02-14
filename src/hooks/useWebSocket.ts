"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  WebSocketManager,
  ConnectionState,
  WSMessage,
  WebSocketConfig,
} from "@/lib/realtime/websocket";

export interface UseWebSocketOptions extends Partial<WebSocketConfig> {
  autoConnect?: boolean;
  onMessage?: (message: WSMessage) => void;
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
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
 * Features:
 * - Auto-reconnection with exponential backoff
 * - Connection state tracking
 * - Message sending and receiving
 * - Topic-based subscriptions
 * - Cleanup on unmount
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
    onOpen,
    onClose,
    ...config
  } = options;

  const wsRef = useRef<WebSocketManager | null>(null);
  const [state, setState] = useState<ConnectionState>("disconnected");

  // Initialize WebSocket manager
  useEffect(() => {
    const ws = new WebSocketManager({
      url: config.url || "",
      protocols: config.protocols,
      reconnectAttempts: config.reconnectAttempts,
      reconnectInterval: config.reconnectInterval,
      maxReconnectInterval: config.maxReconnectInterval,
      heartbeatInterval: config.heartbeatInterval,
      heartbeatTimeout: config.heartbeatTimeout,
      backoffMultiplier: config.backoffMultiplier,
      debug: config.debug,
    });

    wsRef.current = ws;

    // Set up event handlers
    const unsubscribers: (() => void)[] = [];

    unsubscribers.push(
      ws.onStateChange((newState) => {
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

    if (onOpen) {
      unsubscribers.push(ws.onOpen(onOpen));
    }

    if (onClose) {
      unsubscribers.push(ws.onClose(onClose));
    }

    // Auto-connect if enabled
    if (autoConnect && config.url) {
      ws.connect();
    }

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      ws.destroy();
      wsRef.current = null;
    };
  }, [config.url]); // Only re-initialize if URL changes

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

/**
 * Hook for subscribing to a specific topic
 * 
 * @example
 * ```tsx
 * function AgentUpdates({ agentId }: { agentId: string }) {
 *   const { messages, isSubscribed } = useTopic(`agent:${agentId}`);
 *   
 *   useEffect(() => {
 *     if (messages.length > 0) {
 *       const latest = messages[messages.length - 1];
 *       console.log('Latest update:', latest);
 *     }
 *   }, [messages]);
 *   
 *   return <div>{isSubscribed ? 'Subscribed' : 'Connecting...'}</div>;
 * }
 * ```
 */
export function useTopic<T = unknown>(
  topic: string,
  options?: Omit<UseWebSocketOptions, "onMessage">
): {
  messages: WSMessage<T>[];
  isSubscribed: boolean;
  clearMessages: () => void;
} {
  const [messages, setMessages] = useState<WSMessage<T>[]>([]);
  const { subscribe, isConnected } = useWebSocket(options ?? { autoConnect: true });

  useEffect(() => {
    if (!isConnected || !topic) return;

    const unsubscribe = subscribe<T>(topic, (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return unsubscribe;
  }, [topic, isConnected, subscribe]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isSubscribed: isConnected && !!topic,
    clearMessages,
  };
}

/**
 * Hook for singleton WebSocket instance (app-wide)
 * 
 * Use this when you need a single shared connection across components
 * 
 * @example
 * ```tsx
 * function App() {
 *   const { state } = useGlobalWebSocket({
 *     url: process.env.NEXT_PUBLIC_WS_URL!,
 *   });
 *   
 *   return (
 *     <ConnectionStatus state={state} />
 *   );
 * }
 * ```
 */
export function useGlobalWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const { getGlobalWebSocket, resetGlobalWebSocket } = require("@/lib/realtime/websocket");
  
  const [state, setState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocketManager | null>(null);

  useEffect(() => {
    try {
      const ws = getGlobalWebSocket({
        url: options.url || "",
        protocols: options.protocols,
        reconnectAttempts: options.reconnectAttempts,
        reconnectInterval: options.reconnectInterval,
        maxReconnectInterval: options.maxReconnectInterval,
        heartbeatInterval: options.heartbeatInterval,
        heartbeatTimeout: options.heartbeatTimeout,
        backoffMultiplier: options.backoffMultiplier,
        debug: options.debug,
      });

      wsRef.current = ws;

      const unsubscribers: (() => void)[] = [];

      unsubscribers.push(
        ws.onStateChange((newState: ConnectionState) => {
          setState(newState);
          options.onStateChange?.(newState);
        })
      );

      if (options.onMessage) {
        unsubscribers.push(ws.onMessage(options.onMessage));
      }

      if (options.onError) {
        unsubscribers.push(ws.onError(options.onError));
      }

      if (options.onOpen) {
        unsubscribers.push(ws.onOpen(options.onOpen));
      }

      if (options.onClose) {
        unsubscribers.push(ws.onClose(options.onClose));
      }

      if (options.autoConnect !== false && options.url) {
        ws.connect();
      }

      return () => {
        unsubscribers.forEach((unsub) => unsub());
        // Don't destroy global instance on unmount
      };
    } catch (error) {
      // Global instance not initialized yet
      if (options.autoConnect !== false && options.url) {
        // Will be initialized on next render
      }
    }
  }, [options.url]);

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
