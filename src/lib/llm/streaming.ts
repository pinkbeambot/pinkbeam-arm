/**
 * Response Streaming Support
 */

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

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (response: StreamedResponse) => void;
  onError?: (error: StreamError) => void;
  onAbort?: () => void;
}

export interface StreamError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface StreamedResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  model: string;
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'function_call' | 'error' | 'abort';
}

export interface TypingIndicator {
  isTyping: boolean;
  startTime?: Date;
  lastActivity?: Date;
}

export class TypingIndicatorManager {
  private indicators = new Map<string, TypingIndicator>();
  private callbacks = new Map<string, ((indicator: TypingIndicator) => void)[]>();

  startTyping(agentId: string): void {
    const indicator: TypingIndicator = { isTyping: true, startTime: new Date(), lastActivity: new Date() };
    this.indicators.set(agentId, indicator);
    this.notify(agentId, indicator);
  }

  updateActivity(agentId: string): void {
    const indicator = this.indicators.get(agentId);
    if (indicator) { indicator.lastActivity = new Date(); }
  }

  stopTyping(agentId: string): void {
    const indicator: TypingIndicator = { isTyping: false };
    this.indicators.set(agentId, indicator);
    this.notify(agentId, indicator);
  }

  getIndicator(agentId: string): TypingIndicator | undefined {
    return this.indicators.get(agentId);
  }

  subscribe(agentId: string, callback: (indicator: TypingIndicator) => void): () => void {
    if (!this.callbacks.has(agentId)) this.callbacks.set(agentId, []);
    this.callbacks.get(agentId)!.push(callback);
    return () => { const cbs = this.callbacks.get(agentId); const i = cbs?.indexOf(callback); if (i && i > -1) cbs!.splice(i, 1); };
  }

  private notify(agentId: string, indicator: TypingIndicator): void {
    this.callbacks.get(agentId)?.forEach(cb => { try { cb(indicator); } catch (e) {} });
  }
}

export const globalTypingIndicatorManager = new TypingIndicatorManager();

export class StreamHandler {
  private abortController: AbortController;
  private chunks: string[] = [];
  private startTime: number = 0;

  constructor(private config: Partial<StreamConfig> = {}, private callbacks: StreamCallbacks = {}) {
    this.abortController = new AbortController();
    if (config.abortSignal) config.abortSignal.addEventListener('abort', () => this.abort());
  }

  getSignal(): AbortSignal { return this.abortController.signal; }
  isAborted(): boolean { return this.abortController.signal.aborted; }
  abort(): void { this.abortController.abort(); this.callbacks.onAbort?.(); }
  start(): void { this.startTime = Date.now(); this.callbacks.onStart?.(); }
  processChunk(content: string): void { if (this.isAborted()) return; this.chunks.push(content); this.callbacks.onChunk?.(content); }
  handleError(code: string, message: string, retryable: boolean = false): void { this.callbacks.onError?.({ code, message, retryable }); }
  complete(model: string, finishReason: StreamedResponse['finishReason']): StreamedResponse {
    const content = this.chunks.join('');
    const response: StreamedResponse = { content, usage: { inputTokens: 0, outputTokens: Math.ceil(content.length / 4), totalTokens: Math.ceil(content.length / 4) }, model, latencyMs: Date.now() - this.startTime, finishReason };
    this.callbacks.onComplete?.(response);
    return response;
  }
}

export async function* parseAnthropicStream(reader: ReadableStreamDefaultReader<Uint8Array>): AsyncGenerator<{ type: string; delta?: { text?: string } }, void, unknown> {
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') return;
        try { yield JSON.parse(data); } catch {}
      }
    }
  }
}
