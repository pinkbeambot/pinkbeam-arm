/**
 * Performance Monitor Tests
 * 
 * Tests for the PerformanceMonitor component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { PerformanceMonitor, usePerformanceMonitor } from '@/components/performance/PerformanceMonitor';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/test-path',
}));

describe('PerformanceMonitor', () => {
  const originalPerformance = global.performance;
  const originalObserver = global.PerformanceObserver;

  beforeEach(() => {
    // Mock performance
    global.performance = {
      ...originalPerformance,
      getEntriesByType: vi.fn().mockReturnValue([
        { name: 'first-contentful-paint', startTime: 100 },
      ]),
      mark: vi.fn(),
      measure: vi.fn(),
      now: vi.fn().mockReturnValue(Date.now()),
    } as any;

    // Mock PerformanceObserver
    global.PerformanceObserver = class MockPerformanceObserver {
      observe = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn().mockReturnValue([]);
      constructor(public callback: PerformanceObserverCallback) {}
    } as any;

    // Mock navigator.sendBeacon
    Object.defineProperty(global, 'navigator', {
      value: {
        sendBeacon: vi.fn().mockReturnValue(true),
      },
      writable: true,
    });

    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    global.performance = originalPerformance;
    global.PerformanceObserver = originalObserver;
    vi.restoreAllMocks();
  });

  it('should render without errors', () => {
    const { container } = render(<PerformanceMonitor />);
    expect(container.firstChild).toBeNull();
  });

  it('should observe web vitals on mount', () => {
    const observerSpy = vi.fn();
    Object.defineProperty(global, 'PerformanceObserver', {
      writable: true,
      configurable: true,
      value: observerSpy,
    });
    
    render(<PerformanceMonitor />);
    
    // Should have created PerformanceObserver instances
    expect(observerSpy).toHaveBeenCalled();
  });

  it('should report FCP on load', () => {
    // Mock document readyState
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
    });

    render(<PerformanceMonitor />);

    // getEntriesByType should have been called for paint
    expect(performance.getEntriesByType).toHaveBeenCalledWith('paint');
  });
});

describe('usePerformanceMonitor', () => {
  it('should be callable', () => {
    // Simple smoke test
    const TestComponent = () => {
      usePerformanceMonitor();
      return null;
    };

    expect(() => render(<TestComponent />)).not.toThrow();
  });
});
