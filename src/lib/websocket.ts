/**
 * WebSocket Connection Manager
 * 
 * Features:
 * - Connection management with state tracking
 * - Auto-reconnection with exponential backoff
 * - Heartbeat/ping-pong for connection health
 * - Message queueing when disconnected
 * - Error handling and cleanup
 * - TypeScript type safety throughout
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

/**
 * WebSocket Connection Manager
 * 
 * Manages WebSocket connection lifecycle with:
 * - Automatic reconnection
 * - Heartbeat health checks
 * - Message queueing
 * - Event-based architecture
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private state: ConnectionState = 'disconnected';
  private reconnectCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private stateHandlers: Set<StateChangeHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private messageQueue: WSMessage[] = [];
  private isDestroyed = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      url: config.url,
      reconnectAttempts: config.reconnectAttempts ?? 10,
      reconnectInterval: config.reconnectInterval ?? 1000,
      maxReconnectInterval: config.maxReconnectInterval ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      heartbeatTimeout: config.heartbeatTimeout ?? 5000,
      backoffMultiplier: config.backoffMultiplier ?? 1.5,
      debug: config.debug ?? false,
    };
  }

  private log(...args: unknown[]): void {
    if (this.config.debug) {
      console.log('[WebSocketManager]', ...args);
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.log('State change:', this.state, '->', newState);
      this.state = newState;
      this.stateHandlers.forEach(handler => {
        try {
          handler(newState);
        } catch (err) {
          console.error('State handler error:', err);
        }
      });
    }
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === 'connected' && this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.isDestroyed) {
      throw new Error('WebSocketManager has been destroyed');
    }

    if (this.ws?.readyState === WebSocket.CONNECTING || 
        this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState('connecting');
    this.log('Connecting to:', this.config.url);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventListeners();
    } catch (err) {
      this.setState('error');
      this.handleError(err as Error);
    }
  }

  disconnect(): void {
    this.log('Disconnecting...');
    this.clearTimers();
    
    if (this.ws) {
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

  destroy(): void {
    this.log('Destroying...');
    this.isDestroyed = true;
    this.disconnect();
    this.messageHandlers.clear();
    this.stateHandlers.clear();
    this.errorHandlers.clear();
    this.messageQueue = [];
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('Connected');
      this.reconnectCount = 0;
      this.setState('connected');
      this.startHeartbeat();
      this.flushMessageQueue();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      this.handleMessage(event.data);
    };

    this.ws.onerror = () => {
      this.setState('error');
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.log('Closed:', event.code, event.reason);
      this.clearTimers();

      if (this.isDestroyed || event.code === 1000) {
        this.setState('disconnected');
        return;
      }

      this.attemptReconnect();
    };
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WSMessage;
      this.log('Received:', message.type);

      if (message.type === 'heartbeat' || message.type === 'pong') {
        this.handleHeartbeatResponse();
        return;
      }

      this.messageHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (err) {
          console.error('Message handler error:', err);
        }
      });
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  }

  private handleError(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (err) {
        console.error('Error handler error:', err);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectCount >= this.config.reconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.setState('disconnected');
      return;
    }

    this.setState('reconnecting');
    this.reconnectCount++;
    
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.backoffMultiplier, this.reconnectCount - 1),
      this.config.maxReconnectInterval
    );
    
    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectCount})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'heartbeat' });
        
        this.heartbeatTimeoutTimer = setTimeout(() => {
          console.error('Heartbeat timeout');
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

  send<T>(message: WSMessage<T>): boolean {
    if (this.isConnected()) {
      try {
        this.ws!.send(JSON.stringify(message));
        return true;
      } catch (err) {
        console.error('Send error:', err);
        return false;
      }
    } else {
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

  onMessage<T>(handler: MessageHandler<T>): () => void {
    this.messageHandlers.add(handler as MessageHandler);
    return () => {
      this.messageHandlers.delete(handler as MessageHandler);
    };
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  subscribe<T>(topic: string, handler: MessageHandler<T>): () => void {
    const wrappedHandler = (message: WSMessage) => {
      if (message.topic === topic) {
        handler(message as WSMessage<T>);
      }
    };
    
    const unsubscribe = this.onMessage(wrappedHandler);
    
    if (this.isConnected()) {
      this.send({ type: 'join', topic });
    }
    
    return () => {
      unsubscribe();
      if (this.isConnected()) {
        this.send({ type: 'leave', topic });
      }
    };
  }
}

export function createWebSocket(config: WebSocketConfig): WebSocketManager {
  return new WebSocketManager(config);
}
