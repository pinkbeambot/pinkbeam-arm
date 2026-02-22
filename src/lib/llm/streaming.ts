/**
 * Response Streaming Support
 * Implements streaming for chat responses with real-time typing indicators
 */

import type { LLMMessage, LLMFunction } from './types';

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamConfig {
  enabled: boolean;
  showTypingIndicator: boolean;
  partialResponseIntervalMs: number;
  abortSignal?: AbortSignal;
}

export const DEFAULT_STREAM_CONFIG: StreamConfig = {
  enabled: true,
  showTypingIndicator: true,
  partialResponseIntervalMs: 50,
};

export interface StreamChunk {
  id: string;
  content: string;
  isComplete: boolean;
  timestamp: Date;
}

export interface StreamEvent {
  type: 'start' | 'chunk' | 'function_call' | 'error' | 'complete' | 'abort';
  data: StreamChunk | StreamFunctionCall | StreamError | null;
  timestamp: Date;
}

export interface StreamFunctionCall {
  name: string;
  arguments: string; // Accumulated arguments JSON
  isComplete: boolean;
}

export interface StreamError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onFunctionCall?: (functionCall: Partial<StreamFunctionCall>) => void;
  onError?: (error: StreamError) => void;
  onComplete?: (fullResponse: StreamedResponse) => void;
  onAbort?: () => void;
}

export interface StreamedResponse {
  content: string;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  model: string;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'function_call' | 'error' | 'abort';
}

// ============================================================================
// Typing Indicator
// ============================================================================

export interface TypingIndicator {
  isTyping: boolean;
  startTime?: Date;
  lastActivity?: Date;
}

export class TypingIndicatorManager {
  private indicators = new Map<string, TypingIndicator>();
  private callbacks = new Map<string, ((indicator: TypingIndicator) => void)[]>();
  private timeoutMs: number;

  constructor(timeoutMs: number = 30000) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Start typing indicator for an agent
   */
  startTyping(agentId: string): void {
    const now = new Date();
    const indicator: TypingIndicator = {
      isTyping: true,
      startTime: now,
      lastActivity: now,
    };
    
    this.indicators.set(agentId, indicator);
    this.notify(agentId, indicator);

    // Auto-clear after timeout
    setTimeout(() => {
      this.checkTimeout(agentId);
    }, this.timeoutMs);
  }

  /**
   * Update typing activity
   */
  updateActivity(agentId: string): void {
    const indicator = this.indicators.get(agentId);
    if (indicator) {
      indicator.lastActivity = new Date();
      this.indicators.set(agentId, indicator);
    }
  }

  /**
   * Stop typing indicator
   */
  stopTyping(agentId: string): void {
    const indicator: TypingIndicator = {
      isTyping: false,
    };
    this.indicators.set(agentId, indicator);
    this.notify(agentId, indicator);
  }

  /**
   * Get typing indicator for an agent
   */
  getIndicator(agentId: string): TypingIndicator | undefined {
    return this.indicators.get(agentId);
  }

  /**
   * Subscribe to typing indicator changes
   */
  subscribe(agentId: string, callback: (indicator: TypingIndicator) => void): () => void {
    if (!this.callbacks.has(agentId)) {
      this.callbacks.set(agentId, []);
    }
    this.callbacks.get(agentId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(agentId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notify subscribers of indicator change
   */
  private notify(agentId: string, indicator: TypingIndicator): void {
    const callbacks = this.callbacks.get(agentId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(indicator);
        } catch (error) {
          console.error('[TypingIndicator] Callback error:', error);
        }
      }
    }
  }

  /**
   * Check if typing has timed out
   */
  private checkTimeout(agentId: string): void {
    const indicator = this.indicators.get(agentId);
    if (indicator && indicator.isTyping && indicator.lastActivity) {
      const elapsed = Date.now() - indicator.lastActivity.getTime();
      if (elapsed >= this.timeoutMs) {
        this.stopTyping(agentId);
      }
    }
  }
}

// Global typing indicator manager
export const globalTypingIndicatorManager = new TypingIndicatorManager();

// ============================================================================
// Stream Handler
// ============================================================================

export class StreamHandler {
  private abortController: AbortController;
  private callbacks: StreamCallbacks;
  private config: StreamConfig;
  private chunks: string[] = [];
  private functionCallAccumulator: Partial<StreamFunctionCall> | null = null;
  private startTime: number = 0;
  private inputTokens: number = 0;

  constructor(config: Partial<StreamConfig> = {}, callbacks: StreamCallbacks = {}) {
    this.config = { ...DEFAULT_STREAM_CONFIG, ...config };
    this.callbacks = callbacks;
    this.abortController = new AbortController();
    
    // Link external abort signal if provided
    if (config.abortSignal) {
      config.abortSignal.addEventListener('abort', () => this.abort());
    }
  }

  /**
   * Get abort signal for fetch requests
   */
  getSignal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Check if stream is aborted
   */
  isAborted(): boolean {
    return this.abortController.signal.aborted;
  }

  /**
   * Abort the stream
   */
  abort(): void {
    this.abortController.abort();
    this.callbacks.onAbort?.();
  }

  /**
   * Start the stream
   */
  start(inputTokens: number): void {
    this.startTime = Date.now();
    this.inputTokens = inputTokens;
    this.callbacks.onStart?.();
  }

  /**
   * Process a content chunk
   */
  processChunk(content: string): void {
    if (this.isAborted()) return;
    
    this.chunks.push(content);
    this.callbacks.onChunk?.(content);
  }

  /**
   * Process function call chunk
   */
  processFunctionCallChunk(name?: string, argumentsChunk?: string, isComplete: boolean = false): void {
    if (this.isAborted()) return;

    if (!this.functionCallAccumulator) {
      this.functionCallAccumulator = { name: name || '', arguments: '' };
    }

    if (name && !this.functionCallAccumulator.name) {
      this.functionCallAccumulator.name = name;
    }

    if (argumentsChunk) {
      this.functionCallAccumulator.arguments += argumentsChunk;
    }

    this.functionCallAccumulator.isComplete = isComplete;

    this.callbacks.onFunctionCall?.({ ...this.functionCallAccumulator });
  }

  /**
   * Handle stream error
   */
  handleError(code: string, message: string, retryable: boolean = false): void {
    this.callbacks.onError?.({ code, message, retryable });
  }

  /**
   * Complete the stream
   */
  complete(model: string, finishReason: StreamedResponse['finishReason']): StreamedResponse {
    const fullContent = this.chunks.join('');
    const outputTokens = Math.ceil(fullContent.length / 4); // Rough estimate
    
    const response: StreamedResponse = {
      content: fullContent,
      usage: {
        inputTokens: this.inputTokens,
        outputTokens,
        totalTokens: this.inputTokens + outputTokens,
      },
      model,
      latencyMs: Date.now() - this.startTime,
      finishReason,
    };

    if (this.functionCallAccumulator && this.functionCallAccumulator.isComplete) {
      try {
        response.functionCall = {
          name: this.functionCallAccumulator.name,
          arguments: JSON.parse(this.functionCallAccumulator.arguments || '{}'),
        };
      } catch {
        // Invalid JSON, ignore function call
      }
    }

    this.callbacks.onComplete?.(response);
    return response;
  }

  /**
   * Get accumulated content so far
   */
  getPartialContent(): string {
    return this.chunks.join('');
  }
}

// ============================================================================
// Anthropic Streaming Implementation
// ============================================================================

export interface AnthropicStreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' | 
        'content_block_stop' | 'message_delta' | 'message_stop' | 'error';
  index?: number;
  delta?: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
    stop_reason?: string;
    usage?: {
      output_tokens: number;
    };
  };
  content_block?: {
    type: 'text' | 'tool_use';
    text?: string;
    name?: string;
    id?: string;
  };
  message?: {
    usage: {
      input_tokens: number;
    };
  };
  error?: {
    type: string;
    message: string;
  };
}

/**
 * Parse Anthropic streaming response
 */
export async function* parseAnthropicStream(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<AnthropicStreamEvent, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    let currentEvent: Partial<AnthropicStreamEvent> = {};

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        currentEvent.type = line.slice(7) as AnthropicStreamEvent['type'];
      } else if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        try {
          const parsed = JSON.parse(data);
          Object.assign(currentEvent, parsed);
          
          if (currentEvent.type) {
            yield currentEvent as AnthropicStreamEvent;
            currentEvent = {};
          }
        } catch {
          // Ignore parse errors for malformed lines
        }
      } else if (line === '') {
        // Empty line marks end of event
        currentEvent = {};
      }
    }
  }
}

/**
 * Create streaming request to Anthropic
 */
export async function streamAnthropicCompletion(
  apiKey: string,
  requestBody: unknown,
  handler: StreamHandler
): Promise<void> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ ...requestBody, stream: true }),
      signal: handler.getSignal(),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      handler.handleError(
        `ANTHROPIC_${response.status}`,
        error.error?.message || `HTTP ${response.status}`,
        response.status >= 500 || response.status === 429
      );
      return;
    }

    if (!response.body) {
      handler.handleError('NO_BODY', 'Response body is null', false);
      return;
    }

    const reader = response.body.getReader();
    let hasStarted = false;
    let currentBlockType: string | null = null;
    let currentToolName: string | null = null;

    for await (const event of parseAnthropicStream(reader)) {
      if (handler.isAborted()) break;

      switch (event.type) {
        case 'message_start':
          if (!hasStarted) {
            hasStarted = true;
            handler.start(event.message?.usage.input_tokens || 0);
          }
          break;

        case 'content_block_start':
          currentBlockType = event.content_block?.type || null;
          if (event.content_block?.type === 'tool_use') {
            currentToolName = event.content_block.name || null;
          }
          break;

        case 'content_block_delta':
          if (event.delta?.type === 'text_delta') {
            handler.processChunk(event.delta.text || '');
          } else if (event.delta?.type === 'input_json_delta') {
            handler.processFunctionCallChunk(
              currentToolName || undefined,
              event.delta.partial_json,
              false
            );
          }
          break;

        case 'content_block_stop':
          if (currentBlockType === 'tool_use') {
            handler.processFunctionCallChunk(undefined, undefined, true);
          }
          currentBlockType = null;
          break;

        case 'message_stop':
          // Stream complete
          break;

        case 'error':
          handler.handleError(
            event.error?.type || 'STREAM_ERROR',
            event.error?.message || 'Unknown stream error',
            true
          );
          break;
      }
    }

    if (!handler.isAborted()) {
      handler.complete('claude-3-5-sonnet', 'stop');
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        handler.abort();
      } else {
        handler.handleError('STREAM_ERROR', error.message, true);
      }
    }
  }
}

// ============================================================================
// React Hook for Streaming
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseStreamingOptions {
  config?: Partial<StreamConfig>;
  agentId?: string;
  onComplete?: (response: StreamedResponse) => void;
}

export interface UseStreamingReturn {
  isStreaming: boolean;
  partialContent: string;
  isTyping: boolean;
  error: StreamError | null;
  startStream: (request: {
    messages: LLMMessage[];
    model?: string;
    temperature?: number;
  }) => Promise<void>;
  abortStream: () => void;
}

/**
 * React hook for streaming LLM responses
 */
export function useStreaming(options: UseStreamingOptions = {}): UseStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [partialContent, setPartialContent] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<StreamError | null>(null);
  
  const handlerRef = useRef<StreamHandler | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set up typing indicator subscription
  useEffect(() => {
    if (!options.agentId) return;

    const unsubscribe = globalTypingIndicatorManager.subscribe(
      options.agentId,
      (indicator) => setIsTyping(indicator.isTyping)
    );

    return unsubscribe;
  }, [options.agentId]);

  const startStream = useCallback(async (request: {
    messages: LLMMessage[];
    model?: string;
    temperature?: number;
  }) => {
    setIsStreaming(true);
    setPartialContent('');
    setError(null);

    // Start typing indicator
    if (options.agentId) {
      globalTypingIndicatorManager.startTyping(options.agentId);
    }

    // Create abort controller
    abortControllerRef.current = new AbortController();

    // Create stream handler
    handlerRef.current = new StreamHandler(
      { ...options.config, abortSignal: abortControllerRef.current.signal },
      {
        onChunk: (chunk) => {
          setPartialContent(prev => prev + chunk);
          if (options.agentId) {
            globalTypingIndicatorManager.updateActivity(options.agentId);
          }
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
          if (options.agentId) {
            globalTypingIndicatorManager.stopTyping(options.agentId);
          }
        },
        onComplete: (response) => {
          setIsStreaming(false);
          if (options.agentId) {
            globalTypingIndicatorManager.stopTyping(options.agentId);
          }
          options.onComplete?.(response);
        },
        onAbort: () => {
          setIsStreaming(false);
          if (options.agentId) {
            globalTypingIndicatorManager.stopTyping(options.agentId);
          }
        },
      }
    );

    // In a real implementation, this would call the API
    // For now, we'll just simulate
    console.log('[useStreaming] Starting stream with request:', request);
  }, [options]);

  const abortStream = useCallback(() => {
    abortControllerRef.current?.abort();
    handlerRef.current?.abort();
  }, []);

  return {
    isStreaming,
    partialContent,
    isTyping,
    error,
    startStream,
    abortStream,
  };
}
