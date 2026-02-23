/**
 * Performance Hooks Tests
 * 
 * Tests for performance-related hooks.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useDebouncedCallback,
  useThrottledCallback,
} from '@/lib/performance/hooks';

describe('Performance Hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('useDebouncedCallback', () => {
    it('should delay callback execution', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current();
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on rapid calls', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(callback, 300));

      act(() => {
        result.current();
        vi.advanceTimersByTime(100);
        result.current();
        vi.advanceTimersByTime(100);
        result.current();
      });

      expect(callback).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useThrottledCallback', () => {
    it('should limit callback execution rate', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 300));

      act(() => {
        result.current();
        result.current();
        result.current();
      });

      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(300);
        result.current();
      });

      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should allow execution after throttle period', () => {
      const callback = vi.fn();
      const { result } = renderHook(() => useThrottledCallback(callback, 300));

      act(() => {
        result.current();
      });

      expect(callback).toHaveBeenCalledTimes(1);

      act(() => {
        vi.advanceTimersByTime(300);
        result.current();
      });

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });
});
