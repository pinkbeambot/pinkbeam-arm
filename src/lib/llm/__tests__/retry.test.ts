import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateDelay,
  sleep,
  isRetryableError,
  getRetryAfterMs,
  withRetry,
  RetryableError,
  CircuitBreaker,
  CircuitBreakerRegistry,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './retry';

describe('Retry Logic', () => {
  describe('calculateDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: false };
      
      expect(calculateDelay(0, config)).toBe(1000);
      expect(calculateDelay(1, config)).toBe(2000);
      expect(calculateDelay(2, config)).toBe(4000);
      expect(calculateDelay(3, config)).toBe(8000);
    });

    it('should cap delay at maxDelayMs', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: false };
      
      // 1000 * 2^10 = 1,024,000, should be capped at 32,000
      expect(calculateDelay(10, config)).toBe(32000);
    });

    it('should apply jitter when enabled', () => {
      const config = { ...DEFAULT_RETRY_CONFIG, jitter: true };
      
      const delay = calculateDelay(1, config);
      // With jitter, delay should be between 75% and 125% of base
      expect(delay).toBeGreaterThanOrEqual(1500); // 2000 * 0.75
      expect(delay).toBeLessThanOrEqual(2500); // 2000 * 1.25
    });
  });

  describe('sleep', () => {
    it('should resolve after specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
    });
  });

  describe('isRetryableError', () => {
    it('should return true for RetryableError with retryable=true', () => {
      const error = new RetryableError('test', 'CODE', true);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for RetryableError with retryable=false', () => {
      const error = new RetryableError('test', 'CODE', false);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should detect retryable errors from error message', () => {
      const error = new Error('Rate limited: ANTHROPIC_429');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new Error('Something went wrong');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getRetryAfterMs', () => {
    it('should extract retry-after from RetryableError', () => {
      const error = new RetryableError('test', 'CODE', true, 5000);
      expect(getRetryAfterMs(error)).toBe(5000);
    });

    it('should parse retry-after from error message', () => {
      const error = new Error('Rate limited. retry after: 10');
      expect(getRetryAfterMs(error)).toBe(10000);
    });

    it('should return undefined when no retry-after', () => {
      const error = new Error('Some error');
      expect(getRetryAfterMs(error)).toBeUndefined();
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await withRetry(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new RetryableError('retry', 'CODE', true))
        .mockResolvedValueOnce('success');
      
      const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 });
      
      // Fast-forward through retry delay
      await vi.advanceTimersByTimeAsync(100);
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new RetryableError('retry', 'CODE', true));
      
      const promise = withRetry(fn, { maxRetries: 2, baseDelayMs: 100 });
      
      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(100);
      await vi.advanceTimersByTimeAsync(200);
      
      await expect(promise).rejects.toThrow('retry');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fatal'));
      
      await expect(withRetry(fn)).rejects.toThrow('fatal');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new RetryableError('retry', 'CODE', true))
        .mockResolvedValueOnce('success');
      
      const onRetry = vi.fn();
      
      const promise = withRetry(fn, { maxRetries: 3, baseDelayMs: 100 }, onRetry);
      await vi.advanceTimersByTimeAsync(100);
      await promise;
      
      expect(onRetry).toHaveBeenCalledWith(
        expect.objectContaining({ attempt: 0 }),
        expect.any(Number)
      );
    });
  });
});

describe('CircuitBreaker', () => {
  it('should start in closed state', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });

  it('should open after threshold failures', async () => {
    const cb = new CircuitBreaker({ ...DEFAULT_CIRCUIT_BREAKER_CONFIG, failureThreshold: 3 });
    
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    
    // Circuit should be open now
    expect(cb.getState()).toBe('open');
    expect(cb.canExecute()).toBe(false);
    
    // New calls should fail immediately
    await expect(cb.execute(() => Promise.resolve('success'))).rejects.toThrow('Circuit breaker is open');
  });

  it('should close after success threshold in half-open state', async () => {
    const cb = new CircuitBreaker({ 
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG, 
      failureThreshold: 1,
      successThreshold: 2,
      timeoutMs: 0 // Immediate transition to half-open
    });
    
    // Trip the circuit
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(cb.getState()).toBe('open');
    
    // Wait for timeout and then succeed twice
    await sleep(10);
    expect(cb.getState()).toBe('half-open');
    
    await cb.execute(() => Promise.resolve('success'));
    await cb.execute(() => Promise.resolve('success'));
    
    expect(cb.getState()).toBe('closed');
  });

  it('should reset to closed state', async () => {
    const cb = new CircuitBreaker({ ...DEFAULT_CIRCUIT_BREAKER_CONFIG, failureThreshold: 1 });
    
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    expect(cb.getState()).toBe('open');
    
    cb.reset();
    expect(cb.getState()).toBe('closed');
    expect(cb.canExecute()).toBe(true);
  });

  it('should return metrics', async () => {
    const cb = new CircuitBreaker({ ...DEFAULT_CIRCUIT_BREAKER_CONFIG, failureThreshold: 1 });
    
    const initialMetrics = cb.getMetrics();
    expect(initialMetrics.state).toBe('closed');
    expect(initialMetrics.failureCount).toBe(0);
    
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow('fail');
    
    const failureMetrics = cb.getMetrics();
    expect(failureMetrics.state).toBe('open');
    expect(failureMetrics.failureCount).toBe(1);
    expect(failureMetrics.timeUntilRetry).toBeGreaterThan(0);
  });
});

describe('CircuitBreakerRegistry', () => {
  it('should create breakers on demand', () => {
    const registry = new CircuitBreakerRegistry();
    
    const cb1 = registry.getBreaker('provider1');
    const cb2 = registry.getBreaker('provider2');
    
    expect(cb1).not.toBe(cb2);
    expect(registry.getBreaker('provider1')).toBe(cb1); // Same instance
  });

  it('should execute with circuit breaker', async () => {
    const registry = new CircuitBreakerRegistry();
    
    const result = await registry.execute('test', () => Promise.resolve('success'));
    expect(result).toBe('success');
  });

  it('should return metrics for all breakers', async () => {
    const registry = new CircuitBreakerRegistry({ failureThreshold: 1 });
    
    await registry.execute('provider1', () => Promise.resolve('success'));
    await expect(
      registry.execute('provider2', () => Promise.reject(new Error('fail')))
    ).rejects.toThrow('fail');
    
    const metrics = registry.getAllMetrics();
    expect(metrics).toHaveProperty('provider1');
    expect(metrics).toHaveProperty('provider2');
    expect(metrics.provider2.state).toBe('open');
  });

  it('should reset all breakers', async () => {
    const registry = new CircuitBreakerRegistry({ failureThreshold: 1 });
    
    await expect(
      registry.execute('provider1', () => Promise.reject(new Error('fail')))
    ).rejects.toThrow('fail');
    
    registry.resetAll();
    
    const metrics = registry.getAllMetrics();
    expect(metrics.provider1.state).toBe('closed');
  });

  it('should reset specific breaker', async () => {
    const registry = new CircuitBreakerRegistry({ failureThreshold: 1 });
    
    await expect(
      registry.execute('provider1', () => Promise.reject(new Error('fail')))
    ).rejects.toThrow('fail');
    
    registry.reset('provider1');
    
    expect(registry.getBreaker('provider1').getState()).toBe('closed');
  });
});
