/**
 * Retry Logic with Exponential Backoff
<<<<<<< HEAD
 * Implements resilient request handling for LLM calls
=======
>>>>>>> eng-ai/llm-improvements
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
<<<<<<< HEAD
  retryableErrors: [
    'RATE_LIMITED',
    'ANTHROPIC_429',
    'ANTHROPIC_500',
    'ANTHROPIC_502',
    'ANTHROPIC_503',
    'ANTHROPIC_504',
    'NETWORK_ERROR',
    'TIMEOUT',
    'ECONNRESET',
    'ETIMEDOUT',
  ],
=======
  retryableErrors: ['RATE_LIMITED', 'ANTHROPIC_429', 'ANTHROPIC_500', 'TIMEOUT', 'ECONNRESET'],
>>>>>>> eng-ai/llm-improvements
};

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  totalDelayMs: number;
}

export class RetryableError extends Error {
<<<<<<< HEAD
  constructor(
    message: string,
    public code: string,
    public retryable: boolean = true,
    public retryAfterMs?: number
  ) {
=======
  constructor(message: string, public code: string, public retryable: boolean = true, public retryAfterMs?: number) {
>>>>>>> eng-ai/llm-improvements
    super(message);
    this.name = 'RetryableError';
  }
}

<<<<<<< HEAD
/**
 * Calculate delay with exponential backoff and optional jitter
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  // Exponential backoff: baseDelay * (multiplier ^ attempt)
  let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  
  // Cap at max delay
  delay = Math.min(delay, config.maxDelayMs);
  
  // Add jitter (±25%) to prevent thundering herd
  if (config.jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay = Math.floor(delay * jitterFactor);
  }
  
  return delay;
}

/**
 * Sleep for specified milliseconds
 */
=======
export function calculateDelay(attempt: number, config: RetryConfig = DEFAULT_RETRY_CONFIG): number {
  let delay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt);
  delay = Math.min(delay, config.maxDelayMs);
  if (config.jitter) {
    delay = Math.floor(delay * (0.75 + Math.random() * 0.5));
  }
  return delay;
}

>>>>>>> eng-ai/llm-improvements
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

<<<<<<< HEAD
/**
 * Check if error is retryable based on configuration
 */
export function isRetryableError(
  error: unknown,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  if (error instanceof RetryableError) {
    return error.retryable;
  }
  
  if (error instanceof Error) {
    // Check if error message contains any retryable error codes
    return config.retryableErrors.some(code => 
      error.message.includes(code) || 
      error.name.includes(code)
    );
  }
  
  return false;
}

/**
 * Get retry-after header value if present
 */
export function getRetryAfterMs(error: unknown): number | undefined {
  if (error instanceof RetryableError && error.retryAfterMs) {
    return error.retryAfterMs;
  }
  
  // Check for rate limit reset in error
  if (error instanceof Error) {
    const match = error.message.match(/retry[_-]?after[:\s]*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10) * 1000; // Convert seconds to ms
    }
  }
  
  return undefined;
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: (context: RetryContext) => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (context: RetryContext, nextDelayMs: number) => void
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const context: RetryContext = {
    attempt: 0,
    totalDelayMs: 0,
  };

=======
export function isRetryableError(error: unknown, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  if (error instanceof RetryableError) return error.retryable;
  if (error instanceof Error) {
    return config.retryableErrors.some(code => error.message.includes(code));
  }
  return false;
}

export async function withRetry<T>(fn: (context: RetryContext) => Promise<T>, config: Partial<RetryConfig> = {}, onRetry?: (context: RetryContext, nextDelayMs: number) => void): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const context: RetryContext = { attempt: 0, totalDelayMs: 0 };
>>>>>>> eng-ai/llm-improvements
  while (true) {
    try {
      return await fn(context);
    } catch (error) {
      context.lastError = error instanceof Error ? error : new Error(String(error));
<<<<<<< HEAD
      
      // Check if we should retry
      if (context.attempt >= fullConfig.maxRetries || !isRetryableError(error, fullConfig)) {
        throw error;
      }
      
      // Calculate delay
      let delayMs = getRetryAfterMs(error) || calculateDelay(context.attempt, fullConfig);
      
      // Notify retry callback if provided
      if (onRetry) {
        onRetry(context, delayMs);
      }
      
      // Wait before retrying
      await sleep(delayMs);
      
=======
      if (context.attempt >= fullConfig.maxRetries || !isRetryableError(error, fullConfig)) throw error;
      const delayMs = calculateDelay(context.attempt, fullConfig);
      if (onRetry) onRetry(context, delayMs);
      await sleep(delayMs);
>>>>>>> eng-ai/llm-improvements
      context.attempt++;
      context.totalDelayMs += delayMs;
    }
  }
}

<<<<<<< HEAD
/**
 * Retry decorator for class methods
 */
export function Retryable(config: Partial<RetryConfig> = {}) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: unknown[]) {
      return withRetry(
        () => originalMethod.apply(this, args),
        config
      );
    };
    
    return descriptor;
  };
}

/**
 * Create a retry wrapper for any async function
 */
export function createRetryWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return (async (...args: unknown[]) => {
    return withRetry(
      () => fn(...args) as Promise<unknown>,
      config
    );
  }) as T;
}

/**
 * Circuit breaker states
 */
=======
>>>>>>> eng-ai/llm-improvements
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

<<<<<<< HEAD
/**
 * Circuit breaker for LLM providers
 */
=======
>>>>>>> eng-ai/llm-improvements
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

<<<<<<< HEAD
  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    if (this.state === 'open') {
      // Check if timeout has passed to transition to half-open
      if (this.lastFailureTime && Date.now() - this.lastFailureTime >= this.config.timeoutMs) {
        this.state = 'half-open';
        this.halfOpenCalls = 0;
        this.successCount = 0;
      }
=======
  getState(): CircuitState {
    if (this.state === 'open' && this.lastFailureTime && Date.now() - this.lastFailureTime >= this.config.timeoutMs) {
      this.state = 'half-open';
      this.halfOpenCalls = 0;
      this.successCount = 0;
>>>>>>> eng-ai/llm-improvements
    }
    return this.state;
  }

<<<<<<< HEAD
  /**
   * Check if call is allowed
   */
  canExecute(): boolean {
    const state = this.getState();
    
    if (state === 'closed') return true;
    if (state === 'open') return false;
    
    // Half-open state: allow limited calls
    return this.halfOpenCalls < this.config.halfOpenMaxCalls;
  }

  /**
   * Record a successful call
   */
=======
  canExecute(): boolean {
    const state = this.getState();
    if (state === 'closed') return true;
    if (state === 'open') return false;
    return this.halfOpenCalls < this.config.halfOpenMaxCalls;
  }

>>>>>>> eng-ai/llm-improvements
  recordSuccess(): void {
    if (this.state === 'half-open') {
      this.successCount++;
      this.halfOpenCalls++;
<<<<<<< HEAD
      
      if (this.successCount >= this.config.successThreshold) {
        // Reset to closed state
        this.state = 'closed';
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenCalls = 0;
=======
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
>>>>>>> eng-ai/llm-improvements
      }
    } else if (this.state === 'closed') {
      this.failureCount = 0;
    }
  }

<<<<<<< HEAD
  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.state === 'half-open') {
      // Back to open state
=======
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'half-open') {
>>>>>>> eng-ai/llm-improvements
      this.state = 'open';
      this.halfOpenCalls = 0;
      this.successCount = 0;
    } else if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
<<<<<<< HEAD
      // Trip the circuit
=======
>>>>>>> eng-ai/llm-improvements
      this.state = 'open';
    }
  }

<<<<<<< HEAD
  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new RetryableError(
        'Circuit breaker is open',
        'CIRCUIT_OPEN',
        false
      );
    }

=======
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) throw new RetryableError('Circuit breaker is open', 'CIRCUIT_OPEN', false);
>>>>>>> eng-ai/llm-improvements
    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

<<<<<<< HEAD
  /**
   * Get circuit breaker metrics
   */
=======
>>>>>>> eng-ai/llm-improvements
  getMetrics() {
    return {
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
<<<<<<< HEAD
      timeUntilRetry: this.state === 'open' && this.lastFailureTime
        ? Math.max(0, this.config.timeoutMs - (Date.now() - this.lastFailureTime))
        : 0,
    };
  }

  /**
   * Manually reset circuit breaker
   */
=======
      timeUntilRetry: this.state === 'open' && this.lastFailureTime ? Math.max(0, this.config.timeoutMs - (Date.now() - this.lastFailureTime)) : 0,
    };
  }

>>>>>>> eng-ai/llm-improvements
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.lastFailureTime = undefined;
  }
}

<<<<<<< HEAD
/**
 * Provider circuit breaker registry
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();
  private readonly defaultConfig: Partial<CircuitBreakerConfig>;

  constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = defaultConfig;
  }

  /**
   * Get or create circuit breaker for a provider
   */
  getBreaker(providerId: string): CircuitBreaker {
    if (!this.breakers.has(providerId)) {
      this.breakers.set(providerId, new CircuitBreaker(this.defaultConfig));
=======
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  getBreaker(providerId: string): CircuitBreaker {
    if (!this.breakers.has(providerId)) {
      this.breakers.set(providerId, new CircuitBreaker());
>>>>>>> eng-ai/llm-improvements
    }
    return this.breakers.get(providerId)!;
  }

<<<<<<< HEAD
  /**
   * Execute function with circuit breaker for specific provider
   */
  async execute<T>(providerId: string, fn: () => Promise<T>): Promise<T> {
    const breaker = this.getBreaker(providerId);
    return breaker.execute(fn);
  }

  /**
   * Get all circuit breaker metrics
   */
  getAllMetrics(): Record<string, ReturnType<CircuitBreaker['getMetrics']>> {
    const metrics: Record<string, ReturnType<CircuitBreaker['getMetrics']>> = {};
    for (const [id, breaker] of this.breakers) {
      metrics[id] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Reset specific circuit breaker
   */
  reset(providerId: string): void {
    const breaker = this.breakers.get(providerId);
    if (breaker) {
      breaker.reset();
    }
  }
}

// Global circuit breaker registry for LLM providers
=======
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

>>>>>>> eng-ai/llm-improvements
export const globalCircuitBreakerRegistry = new CircuitBreakerRegistry();
