/**
 * Performance Hooks
 * 
 * Custom hooks for performance optimizations including
 * intersection observer, memoization, and lazy loading.
 */

'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { intersectionObserverConfig } from './config';

// ============================================================================
// INTERSECTION OBSERVER HOOK
// ============================================================================

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook to detect when an element enters the viewport.
 * Useful for lazy loading below-fold content.
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
) {
  const { threshold = 0, rootMargin = '100px', triggerOnce = true } = options;
  const ref = useRef<T>(null);
  const [isInView, setIsInView] = useState(false);
  const hasTriggered = useRef(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Skip if already triggered and triggerOnce is true
    if (triggerOnce && hasTriggered.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            hasTriggered.current = true;
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isInView };
}

// ============================================================================
// LAZY RENDER HOOK
// ============================================================================

interface UseLazyRenderOptions {
  delay?: number;
  placeholder?: React.ReactNode;
}

/**
 * Hook to delay rendering of components.
 * Useful for below-fold content that doesn't need immediate rendering.
 */
export function useLazyRender<T extends HTMLElement = HTMLDivElement>(
  options: UseLazyRenderOptions = {}
) {
  const { delay = 100 } = options;
  const { ref, isInView } = useInView<T>({ rootMargin: '50px' });
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isInView, delay]);

  return { ref, shouldRender, isInView };
}

// ============================================================================
// VIRTUAL LIST HOOK
// ============================================================================

interface UseVirtualListOptions<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  containerHeight: number;
}

interface VirtualItem<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
}

/**
 * Hook for virtualizing long lists.
 * Only renders items that are visible in the viewport.
 */
export function useVirtualList<T>({
  items,
  itemHeight,
  overscan = 5,
  containerHeight,
}: UseVirtualListOptions<T>) {
  const [scrollTop, setScrollTop] = useState(0);

  const virtualItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const virtualItems: VirtualItem<T>[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      virtualItems.push({
        item: items[i],
        index: i,
        style: {
          position: 'absolute' as const,
          top: i * itemHeight,
          height: itemHeight,
          left: 0,
          right: 0,
        },
      });
    }

    return virtualItems;
  }, [items, itemHeight, scrollTop, containerHeight, overscan]);

  const totalHeight = items.length * itemHeight;

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    virtualItems,
    totalHeight,
    onScroll,
  };
}

// ============================================================================
// DEBOUNCED CALLBACK HOOK
// ============================================================================

/**
 * Hook to debounce a callback function.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

// ============================================================================
// THROTTLED CALLBACK HOOK
// ============================================================================

/**
 * Hook to throttle a callback function.
 */
export function useThrottledCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  limit: number
) {
  const inThrottle = useRef(false);

  return useCallback(
    (...args: Parameters<T>) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    },
    [callback, limit]
  );
}

// ============================================================================
// PERFORMANCE MARKER HOOK
// ============================================================================

/**
 * Hook to measure component render performance.
 * Only active in development mode.
 */
export function usePerformanceMarker(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    const measureName = `${componentName}-render`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
      const measure = performance.getEntriesByName(measureName)[0];
      if (measure) {
        console.log(`[Performance] ${componentName} rendered in ${measure.duration.toFixed(2)}ms`);
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(measureName);
      }
    };
  }, [componentName]);
}
