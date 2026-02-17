/**
 * Performance Hooks Tests
 * 
 * Tests for performance-related hooks.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  useInView,
  useLazyRender,
  useDebouncedCallback,
  useThrottledCallback,
} from '@/lib/performance/hooks';
import { mockIntersectionObserver, triggerIntersection } from '@/lib/performance/test-utils';

describe('Performance Hooks', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('useInView', () => {
    it('should return false initially', () => {
      const { mockObserve } = mockIntersectionObserver();
      const { result } = renderHook(() => useInView());

      expect(result.current.isInView).toBe(false);
      expect(mockObserve).toHaveBeenCalled();
    });

    it('should update isInView when element enters viewport', () => {
      mockIntersectionObserver();
      const { result } = renderHook(() => useInView());

      act(() => {
        triggerIntersection(true);
      });

      expect(result.current.isInView).toBe(true);
    });

    it('should respect triggerOnce option', () => {
      mockIntersectionObserver();
      const { result } = renderHook(() => useInView({ triggerOnce: true }));

      act(() => {
        triggerIntersection(true);
      });

      expect(result.current.isInView).toBe(true);

      // Should remain true even when element leaves viewport
      act(() => {
        triggerIntersection(false);
      });

      expect(result.current.isInView).toBe(true);
    });
  });

  describe('useLazyRender', () => {
    it('should not render immediately', () => {
      mockIntersectionObserver();
      const { result } = renderHook(() => useLazyRender({ delay: 100 }));

      expect(result.current.shouldRender).toBe(false);
    });

    it('should render after delay when in view', async () => {
      mockIntersectionObserver();
      const { result } = renderHook(() => useLazyRender({ delay: 100 }));

      act(() => {
        triggerIntersection(true);
      });

      // Still false immediately after intersection
      expect(result.current.shouldRender).toBe(false);

      // True after delay
      act(() => {
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.shouldRender).toBe(true);
      });
    });
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
