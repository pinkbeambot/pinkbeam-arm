/**
 * WebSocket Connection Manager
 * 
 * A robust WebSocket client with:
 * - Auto-reconnection with exponential backoff
 * - Event emitter pattern for message handling
 * - Type-safe message interfaces
 * - Connection state management
 * - Heartbeat/ping-pong
 * - Error handling and cleanup
 * - Subscribe/unsubscribe methods
 * 
 * Compatible with Supabase Realtime
 */

export type ConnectionState = 
  | 'connecting' 
  | 'connected' 
  | 'disconnected' 
  | 'reconnecting' 
  | 'error';

export interface WSMessage<T = unknown> {
  type: string;
  payload?: T;
  ref?: string;
  topic?: string;
  event?: string;
}

export interface WebSocketConfig {
  url: string;
  protocols?: string | string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  maxReconnectInterval?: number;
  heartbeatInterval?: number;
  heartbeatTimeout?: number;
  backoffMultiplier?: number;
  debug?: boolean;
}

export type MessageHandler<T = unknown> = (message: WSMessage<T>) => void;
export type StateChangeHandler = (state: ConnectionState) => void;
export type ErrorHandler = (error: Error) => void;

type EventHandlers = {
  message: Set<MessageHandler>;
  stateChange: Set<StateChangeHandler>;
  error: Set<ErrorHandler>;
  open: Set<() => void>;
  close: Set<() => void>;
};

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = 'disconnected';
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private handlers: EventHandlers = {
    message: new Set(),
    stateChange: new Set(),
    error: new Set(),
    open: new Set(),
    close: new Set(),
  };
  private subscriptions: Map<string, Set<MessageHandler>> = new Map();
  private messageQueue: WSMessage[] = [];
  private isDestroyed = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      protocols: config.protocols ?? [],
      reconnectAttempts: config.reconnectAttempts ?? 10,
      reconnectInterval: config.reconnectInterval ?? 1000,
      maxReconnectInterval: config.maxReconnectInterval ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      heartbeatTimeout: config.heartbeatTimeout ?? 5000,
      backoffMultiplier: config.backoffMultiplier ?? 1.5,
      debug: config.debug ?? false,
    };
  }

  // Logging
  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[WebSocketManager]', ...args);
    }
  }

  private error(...args: unknown[]): void {
    console.error('[WebSocketManager]', ...args);
  }

  // State management
  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.log('State change:', this.state, '->', newState);
      this.state = newState;
      this.handlers.stateChange.forEach(handler => {
        try {
          handler(newState);
        } catch (err) {
          this.error('State change handler error:', err);
        }
      });
    }
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  // Connection methods
  public connect(): void {
    if (this.isDestroyed) {
      throw new Error('WebSocketManager has been destroyed');
    }

    if (this.ws?.readyState === WebSocket.CONNECTING || 
        this.ws?.readyState === WebSocket.OPEN) {
      this.log('Already connected or connecting');
      return;
    }

    this.setState('connecting');
    this.log('Connecting to:', this.config.url);

    try {
      this.ws = new WebSocket(this.config.url, this.config.protocols);
      this.setupEventListeners();
    } catch (err) {
      this.error('Failed to create WebSocket:', err);
      this.setState('error');
      this.handleError(err as Error);
    }
  }

  public disconnect(): void {
    this.log('Disconnecting...');
    this.clearTimers();
    
    if (this.ws) {
      // Remove listeners before closing to prevent reconnection
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      this.ws.onopen = null;
      
      if (this.ws.readyState === WebSocket.OPEN || 
          this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Client disconnect');
      }
      
      this.ws = null;
    }
    
    this.reconnectCount = 0;
    this.setState('disconnected');
  }

  public destroy(): void {
    this.log('Destroying...');
    this.isDestroyed = true;
    this.disconnect();
    
    // Clear all handlers
    this.handlers.message.clear();
    this.handlers.stateChange.clear();
    this.handlers.error.clear();
    this.handlers.open.clear();
    this.handlers.close.clear();
    this.subscriptions.clear();
    this.messageQueue = [];
  }

  // Event listener setup
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('Connected');
      this.reconnectCount = 0;
      this.setState('connected');
      this.startHeartbeat();
      this.flushMessageQueue();
      
      this.handlers.open.forEach(handler => {
        try {
          handler();
        } catch (err) {
          this.error('Open handler error:', err);
        }
      });
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = (event: Event) => {
      this.error('WebSocket error:', event);
      this.setState('error');
      const error = new Error('WebSocket error');
      this.handleError(error);
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.log('Closed:', event.code, event.reason);
      this.clearTimers();
      
      this.handlers.close.forEach(handler => {
        try {
          handler();
        } catch (err) {
          this.error('Close handler error:', err);
        }
      });

      // Don't reconnect if destroyed or normal close
      if (this.isDestroyed || event.code === 1000) {
        this.setState('disconnected');
        return;
      }

      this.attemptReconnect();
    };
  }

  // Message handling
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WSMessage;
      this.log('Received:', message.type, message.topic || '');

      // Handle heartbeat response
      if (message.type === 'heartbeat' || message.type === 'pong') {
        this.handleHeartbeatResponse();
        return;
      }

      // Notify general message handlers
      this.handlers.message.forEach(handler => {
        try {
          handler(message);
        } catch (err) {
          this.error('Message handler error:', err);
        }
      });

      // Notify topic-specific subscribers
      if (message.topic) {
        const topicHandlers = this.subscriptions.get(message.topic);
        if (topicHandlers) {
          topicHandlers.forEach(handler => {
            try {
              handler(message);
            } catch (err) {
              this.error('Subscription handler error:', err);
            }
          });
        }
      }
    } catch (err) {
      this.error('Failed to parse message:', err);
    }
  }

  private handleError(error: Error): void {
    this.handlers.error.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        this.error('Error handler error:', err);
      }
    });
  }

  // Reconnection logic
  private attemptReconnect(): void {
    if (this.reconnectCount >= this.config.reconnectAttempts) {
      this.error('Max reconnection attempts reached');
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    this.reconnectCount++;
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.backoffMultiplier, this.reconnectCount - 1),
      this.config.maxReconnectInterval
    );
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount}/${this.config.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }

  // Heartbeat
  private startHeartbeat(): void {
    this.clearHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'heartbeat' });
        
        // Set timeout for heartbeat response
        this.heartbeatTimeoutTimer = setTimeout(() => {
          this.error('Heartbeat timeout');
          this.ws?.close(3000, 'Heartbeat timeout');
        }, this.config.heartbeatTimeout);
      }
    }, this.config.heartbeatInterval);
  }

  private handleHeartbeatResponse(): void {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // Message sending
  public send<T>(message: WSMessage<T>): boolean {
    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(message));
        return true;
      } catch (err) {
        this.error('Send error:', err);
        return false;
      }
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message);
      return false;
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  // Event subscription methods
  public onMessage<T>(handler: MessageHandler<T>): () => void {
    this.handlers.message.add(handler as MessageHandler);
    return () => {
      this.handlers.message.delete(handler as MessageHandler);
    };
  }

  public onStateChange(handler: StateChangeHandler): () => void {
    this.handlers.stateChange.add(handler);
    return () => {
      this.handlers.stateChange.delete(handler);
    };
  }

  public onError(handler: ErrorHandler): () => void {
    this.handlers.error.add(handler);
    return () => {
      this.handlers.error.delete(handler);
    };
  }

  public onOpen(handler: () => void): () => void {
    this.handlers.open.add(handler);
    return () => {
      this.handlers.open.delete(handler);
    };
  }

  public onClose(handler: () => void): () => void {
    this.handlers.close.add(handler);
    return () => {
      this.handlers.close.delete(handler);
    };
  }

  // Topic subscription (for Supabase Realtime compatibility)
  public subscribe<T>(topic: string, handler: MessageHandler<T>): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    
    const handlers = this.subscriptions.get(topic)!;
    handlers.add(handler as MessageHandler);
    
    // Send join message if connected
    if (this.isConnected()) {
      this.send({
        type: 'join',
        topic,
      });
    }
    
    return () => {
      handlers.delete(handler as MessageHandler);
      if (handlers.size === 0) {
        this.subscriptions.delete(topic);
        // Send leave message if connected
        if (this.isConnected()) {
          this.send({
            type: 'leave',
            topic,
          });
        }
      }
    };
  }

  // Supabase Realtime compatibility
  public channel(topic: string): {
    subscribe: (handler?: MessageHandler) => () => void;
    unsubscribe: () => void;
  } {
    return {
      subscribe: (handler?: MessageHandler) => {
        if (handler) {
          return this.subscribe(topic, handler);
        }
        // Just join without handler
        if (this.isConnected()) {
          this.send({ type: 'join', topic });
        }
        return () => {
          if (this.isConnected()) {
            this.send({ type: 'leave', topic });
          }
        };
      },
      unsubscribe: () => {
        if (this.isConnected()) {
          this.send({ type: 'leave', topic });
        }
      },
    };
  }
}

// Factory function for creating instances
export function createWebSocket(config: WebSocketConfig): WebSocketManager {
  return new WebSocketManager(config);
}

// Singleton instance for app-wide usage
let globalInstance: WebSocketManager | null = null;

export function getGlobalWebSocket(config?: WebSocketConfig): WebSocketManager {
  if (!globalInstance && config) {
    globalInstance = new WebSocketManager(config);
  }
  if (!globalInstance) {
    throw new Error('Global WebSocket not initialized');
  }
  return globalInstance;
}

export function resetGlobalWebSocket(): void {
  globalInstance?.destroy();
  globalInstance = null;
}
