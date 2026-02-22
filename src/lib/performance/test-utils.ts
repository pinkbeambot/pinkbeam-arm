/**
 * Performance Test Utilities
 * 
 * Helper functions for testing performance-related functionality.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { vi, expect } from 'vitest';
import React from 'react';

/**
 * Mock IntersectionObserver for testing lazy loading components.
 */
export function mockIntersectionObserver() {
  const mockObserve = vi.fn();
  const mockDisconnect = vi.fn();
  const mockUnobserve = vi.fn();

  class MockIntersectionObserver implements IntersectionObserver {
    observe = mockObserve;
    disconnect = mockDisconnect;
    unobserve = mockUnobserve;
    root: Element | Document | null = null;
    rootMargin: string = '';
    thresholds: ReadonlyArray<number> = [];
    takeRecords = vi.fn(() => []);
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: MockIntersectionObserver,
  });

  return { mockObserve, mockDisconnect, mockUnobserve };
}

/**
 * Trigger intersection observer callback for testing.
 */
export function triggerIntersection(
  isIntersecting: boolean,
  options?: Partial<IntersectionObserverEntry>
) {
  const callbacks = new Set<IntersectionObserverCallback>();
  
  // Override IntersectionObserver to capture callbacks
  const OriginalObserver = window.IntersectionObserver;
  window.IntersectionObserver = class extends OriginalObserver {
    constructor(callback: IntersectionObserverCallback) {
      super(callback);
      callbacks.add(callback);
    }
  } as typeof IntersectionObserver;

  // Trigger all callbacks
  callbacks.forEach((callback) => {
    callback(
      [
        {
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: {} as DOMRectReadOnly,
          boundingClientRect: {} as DOMRectReadOnly,
          rootBounds: null,
          target: document.createElement('div'),
          time: Date.now(),
          ...options,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver
    );
  });
}

/**
 * Measure render time for a component.
 */
export async function measureRenderTime<T extends Record<string, unknown>>(
  Component: React.ComponentType<T>,
  props: T = {} as T
): Promise<number> {
  const startTime = performance.now();
  render(React.createElement(Component, props));
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Wait for lazy loaded component to appear.
 */
export async function waitForLazyComponent(
  testId: string,
  timeout: number = 3000
): Promise<void> {
  await waitFor(
    () => {
      expect(screen.queryByTestId(testId)).toBeInTheDocument();
    },
    { timeout }
  );
}

/**
 * Mock performance.now() for consistent testing.
 */
export function mockPerformanceNow(timestamps: number[] = [0, 100, 200, 300]) {
  let index = 0;
  return vi.spyOn(performance, 'now').mockImplementation(() => {
    return timestamps[index++ % timestamps.length] || Date.now();
  });
}

/**
 * Mock requestIdleCallback for testing.
 */
export function mockRequestIdleCallback() {
  if (!window.requestIdleCallback) {
    Object.defineProperty(window, 'requestIdleCallback', {
      writable: true,
      configurable: true,
      value: (callback: IdleRequestCallback) => {
        return setTimeout(() => {
          callback({
            didTimeout: false,
            timeRemaining: () => 50,
          } as IdleDeadline);
        }, 1);
      },
    });

    Object.defineProperty(window, 'cancelIdleCallback', {
      writable: true,
      configurable: true,
      value: (id: number) => clearTimeout(id),
    });
  }
}
