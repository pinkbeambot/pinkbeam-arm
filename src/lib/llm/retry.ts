/**
 * Retry Logic with Exponential Backoff
 */

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 32000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['RATE_LIMITED', 'ANTHROPIC_429', 'ANTHROPIC_500', 'TIMEOUT', 'ECONNRESET'],
};

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  totalDelayMs: number;
}

export class RetryableError extends Error {
  constructor(message: string, public code: string, public retryable: boolean = true, public retryAfterMs?: number) {
    super(message);
    this.name = 'RetryableError';
  }
}

export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  delay = Math.min(delay, config.maxDelayMs);
  if (config.jitter) {
    delay = Math.floor(delay * (0.75 + Math.random() * 0.5));
  }
  return delay;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function isRetryableError(error: unknown, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  if (error instanceof RetryableError) return error.retryable;
  if (error instanceof Error) {
    return config.retryableErrors.some(code => error.message.includes(code));
  }
  return false;
}

export function getRetryAfterMs(error: unknown): number | undefined {
  if (error instanceof RetryableError) return error.retryAfterMs;
  return undefined;
}

export async function withRetry<T>(fn: (context: RetryContext) => Promise<T>, config: Partial<RetryConfig> = {}, onRetry?: (context: RetryContext, nextDelayMs: number) => void): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const context: RetryContext = { attempt: 0, totalDelayMs: 0 };
  while (true) {
    try {
      return await fn(context);
    } catch (error) {
      context.lastError = error instanceof Error ? error : new Error(String(error));
      if (context.attempt >= fullConfig.maxRetries || !isRetryableError(error, fullConfig)) throw error;
      const delayMs = calculateDelay(context.attempt, fullConfig);
      if (onRetry) onRetry(context, delayMs);
      await sleep(delayMs);
      context.attempt++;
      context.totalDelayMs += delayMs;
    }
  }
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeoutMs: number;
  halfOpenMaxCalls: number;
}

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeoutMs: 60000,
  halfOpenMaxCalls: 3,
};

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  private halfOpenCalls = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  getState(): CircuitState {
    if (this.state === 'open' && this.lastFailureTime && Date.now() - this.lastFailureTime >= this.config.timeoutMs) {
      this.state = 'half-open';
      this.halfOpenCalls = 0;
      this.successCount = 0;
    }
    return this.state;
  }

  canExecute(): boolean {
    const state = this.getState();
    if (state === 'closed') return true;
    if (state === 'open') return false;
    return this.halfOpenCalls < this.config.halfOpenMaxCalls;
  }

  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      this.halfOpenCalls++;
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'half-open') {
      this.state = 'open';
      this.halfOpenCalls = 0;
      this.successCount = 0;
    } else if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) throw new RetryableError('Circuit breaker is open', 'CIRCUIT_OPEN', false);
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  getMetrics() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      timeUntilRetry: this.state === 'open' && this.lastFailureTime ? Math.max(0, this.config.timeoutMs - (Date.now() - this.lastFailureTime)) : 0,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = undefined;
  }
}

export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();
  private defaultConfig?: Partial<CircuitBreakerConfig>;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.defaultConfig = config;
  }

  getBreaker(providerId: string): CircuitBreaker {
    if (!this.breakers.has(providerId)) {
      this.breakers.set(providerId, new CircuitBreaker(this.defaultConfig));
    }
    return this.breakers.get(providerId)!;
  }

  async execute<T>(providerId: string, fn: () => Promise<T>): Promise<T> {
    return this.getBreaker(providerId).execute(fn);
  }

  getAllMetrics() {
    const metrics: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};
    for (const [id, breaker] of this.breakers) metrics[id] = breaker.getMetrics();
    return metrics;
  }

  resetAll(): void {
    for (const breaker of this.breakers.values()) breaker.reset();
  }

  reset(providerId: string): void {
    this.breakers.get(providerId)?.reset();
  }
}

export const globalCircuitBreakerRegistry = new CircuitBreakerRegistry();
