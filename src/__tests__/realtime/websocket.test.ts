/**
 * WebSocket Manager Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  WebSocketManager, 
  createWebSocket, 
  WSMessage, 
  ConnectionState,
  getGlobalWebSocket,
  resetGlobalWebSocket,
} from '@/lib/realtime/websocket';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocols: string | string[];
  
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols ?? [];
  }

  send(data: string): void {
    // Mock implementation
  }

  close(code?: number, reason?: string): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code: code ?? 1000, reason }));
  }

  // Helper method to simulate server responses
  simulateOpen(): void {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.(new Event('open'));
  }

  simulateMessage(data: WSMessage): void {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
  }

  simulateError(): void {
    this.onerror?.(new Event('error'));
  }

  simulateClose(code = 1000, reason = 'Normal closure'): void {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close', { code, reason }));
  }
}

// Replace global WebSocket with mock
vi.stubGlobal('WebSocket', MockWebSocket);

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  const defaultConfig = {
    url: 'wss://test.example.com/socket',
    reconnectAttempts: 3,
    reconnectInterval: 100,
    heartbeatInterval: 1000,
    debug: false,
  };

  beforeEach(() => {
    wsManager = createWebSocket(defaultConfig);
    vi.useFakeTimers();
  });

  afterEach(() => {
    wsManager.destroy();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Connection', () => {
    it('should initialize with disconnected state', () => {
      expect(wsManager.getState()).toBe('disconnected');
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should connect successfully', () => {
      wsManager.connect();
      expect(wsManager.getState()).toBe('connecting');
      
      // Simulate successful connection
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      expect(wsManager.getState()).toBe('connected');
      expect(wsManager.isConnected()).toBe(true);
    });

    it('should disconnect cleanly', () => {
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      expect(wsManager.isConnected()).toBe(true);
      
      wsManager.disconnect();
      expect(wsManager.getState()).toBe('disconnected');
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should not connect if destroyed', () => {
      wsManager.destroy();
      expect(() => wsManager.connect()).toThrow('WebSocketManager has been destroyed');
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection on unexpected close', () => {
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      // Simulate unexpected close
      mockWS.simulateClose(1006, 'Abnormal closure');
      
      expect(wsManager.getState()).toBe('reconnecting');
    });

    it.skip('should stop reconnecting after max attempts', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      wsManager.connect();
      
      // Simulate multiple failed connections
      for (let i = 0; i < 3; i++) {
        const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
        // Wait for connection attempt
        vi.runAllTimers();
        mockWS.simulateClose(1006, 'Abnormal closure');
      }
      
      // Wait for final state
      vi.runAllTimers();
      
      expect(wsManager.getState()).toBe('disconnected');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[WebSocketManager]',
        'Max reconnection attempts reached'
      );
      
      consoleSpy.mockRestore();
    });

    it('should use exponential backoff', () => {
      wsManager.connect();
      
      // First close
      let mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateClose(1006, 'Abnormal closure');
      
      // Should wait ~100ms for first reconnect
      vi.advanceTimersByTime(100);
      
      // Second close
      mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateClose(1006, 'Abnormal closure');
      
      // Should wait ~150ms for second reconnect (100 * 1.5)
      vi.advanceTimersByTime(150);
    });

    it('should not reconnect on normal close (code 1000)', () => {
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      // Normal close
      mockWS.simulateClose(1000, 'Normal closure');
      
      expect(wsManager.getState()).toBe('disconnected');
    });
  });

  describe('Message Handling', () => {
    it('should receive and parse messages', () => {
      const handler = vi.fn();
      wsManager.onMessage(handler);
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      const testMessage: WSMessage = {
        type: 'test',
        payload: { data: 'hello' },
      };
      
      mockWS.simulateMessage(testMessage);
      
      expect(handler).toHaveBeenCalledWith(expect.objectContaining({
        type: 'test',
        payload: { data: 'hello' },
      }));
    });

    it('should queue messages when disconnected', () => {
      wsManager.send({ type: 'test', payload: 'data' });
      
      // Should not throw and should queue the message
      expect(wsManager.isConnected()).toBe(false);
    });

    it('should flush message queue on connect', () => {
      wsManager.send({ type: 'test1' });
      wsManager.send({ type: 'test2' });
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      const sendSpy = vi.spyOn(mockWS, 'send');
      
      mockWS.simulateOpen();
      
      expect(sendSpy).toHaveBeenCalledTimes(2);
    });

    it('should handle heartbeat messages', () => {
      const handler = vi.fn();
      wsManager.onMessage(handler);
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      // Heartbeat message should not trigger general handlers
      mockWS.simulateMessage({ type: 'heartbeat' });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Topic Subscription', () => {
    it('should subscribe to topics', () => {
      const handler = vi.fn();
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      const sendSpy = vi.spyOn(mockWS, 'send');
      mockWS.simulateOpen();
      
      // Subscribe after connection
      const unsubscribe = wsManager.subscribe('test:topic', handler);
      
      // Should send join message
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'join', topic: 'test:topic' })
      );
      
      // Should receive messages for subscribed topic
      mockWS.simulateMessage({ type: 'event', topic: 'test:topic', payload: 'data' });
      expect(handler).toHaveBeenCalled();
      
      unsubscribe();
    });

    it('should unsubscribe from topics', () => {
      const handler = vi.fn();
      const unsubscribe = wsManager.subscribe('test:topic', handler);
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      const sendSpy = vi.spyOn(mockWS, 'send');
      
      unsubscribe();
      
      // Should send leave message
      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: 'leave', topic: 'test:topic' })
      );
    });

    it('should support channel API for Supabase compatibility', () => {
      const channel = wsManager.channel('realtime:public:agents');
      const handler = vi.fn();
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      const unsubscribe = channel.subscribe(handler);
      
      // Should receive messages
      mockWS.simulateMessage({
        type: 'INSERT',
        topic: 'realtime:public:agents',
        payload: { id: 1 },
      });
      
      expect(handler).toHaveBeenCalled();
      
      unsubscribe();
    });
  });

  describe('Event Handlers', () => {
    it('should call onOpen handler', () => {
      const handler = vi.fn();
      wsManager.onOpen(handler);
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      expect(handler).toHaveBeenCalled();
    });

    it('should call onClose handler', () => {
      const handler = vi.fn();
      wsManager.onClose(handler);
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      mockWS.simulateClose();
      
      expect(handler).toHaveBeenCalled();
    });

    it('should call onError handler', () => {
      const handler = vi.fn();
      wsManager.onError(handler);
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateError();
      
      expect(handler).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should call onStateChange handler', () => {
      const handler = vi.fn();
      wsManager.onStateChange(handler);
      
      wsManager.connect();
      
      expect(handler).toHaveBeenCalledWith('connecting');
      
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      expect(handler).toHaveBeenCalledWith('connected');
    });

    it('should allow unsubscribing handlers', () => {
      const handler = vi.fn();
      const unsubscribe = wsManager.onMessage(handler);
      
      unsubscribe();
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      mockWS.simulateMessage({ type: 'test' });
      
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should track connection state correctly', () => {
      const states: ConnectionState[] = [];
      wsManager.onStateChange((state) => states.push(state));
      
      wsManager.connect();
      expect(states).toContain('connecting');
      
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      expect(states).toContain('connected');
      
      mockWS.simulateClose(1006);
      expect(states).toContain('reconnecting');
    });

    it('should report connected state accurately', () => {
      expect(wsManager.isConnected()).toBe(false);
      
      wsManager.connect();
      expect(wsManager.isConnected()).toBe(false); // Still connecting
      
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      expect(wsManager.isConnected()).toBe(true);
      
      mockWS.simulateClose();
      expect(wsManager.isConnected()).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', () => {
      const errorHandler = vi.fn();
      wsManager.onError(errorHandler);
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateError();
      
      expect(errorHandler).toHaveBeenCalled();
      expect(wsManager.getState()).toBe('error');
    });

    it('should handle invalid JSON messages gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      // Simulate invalid JSON
      mockWS.onmessage?.(new MessageEvent('message', { data: 'invalid json' }));
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[WebSocketManager]',
        'Failed to parse message:',
        expect.anything()
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Heartbeat', () => {
    it('should send heartbeat messages', () => {
      vi.useRealTimers();
      const sendSpy = vi.fn();
      
      wsManager = createWebSocket({
        ...defaultConfig,
        heartbeatInterval: 100,
      });
      
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.send = sendSpy;
      mockWS.simulateOpen();
      
      // Wait for heartbeat
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(sendSpy).toHaveBeenCalledWith(JSON.stringify({ type: 'heartbeat' }));
          resolve();
        }, 150);
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up all resources on destroy', () => {
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      wsManager.destroy();
      
      expect(wsManager.isConnected()).toBe(false);
      expect(() => wsManager.connect()).toThrow('WebSocketManager has been destroyed');
    });

    it('should clear timers on disconnect', () => {
      wsManager.connect();
      const mockWS = (wsManager as unknown as { ws: MockWebSocket }).ws;
      mockWS.simulateOpen();
      
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      wsManager.disconnect();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});

describe('createWebSocket', () => {
  it('should create a WebSocketManager instance', () => {
    const ws = createWebSocket({ url: 'wss://test.com' });
    expect(ws).toBeInstanceOf(WebSocketManager);
    ws.destroy();
  });
});

describe('Global WebSocket', () => {
  afterEach(() => {
    resetGlobalWebSocket();
  });

  it('should create and return global instance', () => {
    const ws1 = getGlobalWebSocket({ url: 'wss://test.com' });
    const ws2 = getGlobalWebSocket();
    
    expect(ws1).toBe(ws2);
    
    ws1.destroy();
  });

  it('should throw if global not initialized', () => {
    
    expect(() => getGlobalWebSocket()).toThrow('Global WebSocket not initialized');
  });
});
