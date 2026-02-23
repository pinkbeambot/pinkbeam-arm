/**
 * Performance Monitor Component
 * 
 * Tracks and reports Core Web Vitals and custom performance metrics.
 * Only active in production builds.
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

type WebVitalMetric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id: string;
  navigationType?: string;
};

// Performance budget thresholds
const BUDGETS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
  INP: { good: 200, poor: 500 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const budget = BUDGETS[name as keyof typeof BUDGETS];
  if (!budget) return 'good';
  
  if (value <= budget.good) return 'good';
  if (value <= budget.poor) return 'needs-improvement';
  return 'poor';
}

function reportMetric(metric: WebVitalMetric) {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }

  // Send to analytics in production
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Send to your analytics endpoint
    const body = JSON.stringify({
      ...metric,
      url: window.location.href,
      timestamp: Date.now(),
    });

    // Use sendBeacon if available, fallback to fetch
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/vitals', body);
    } else {
      fetch('/api/analytics/vitals', {
        method: 'POST',
        body,
        keepalive: true,
      }).catch(() => {
        // Silently fail - don't impact user experience
      });
    }
  }
}

// Use native Performance Observer if available
function observeWebVitals() {
  if (typeof window === 'undefined') return;

  // CLS - Cumulative Layout Shift
  if ('PerformanceObserver' in window) {
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!layoutShiftEntry.hadRecentInput) {
            clsValue += layoutShiftEntry.value ?? 0;
          }
        }
        reportMetric({
          name: 'CLS',
          value: clsValue,
          rating: getRating('CLS', clsValue),
          id: `cls-${Date.now()}`,
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // CLS not supported
    }

    // LCP - Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime?: number };
        if (lastEntry) {
          const value = lastEntry.startTime ?? 0;
          reportMetric({
            name: 'LCP',
            value,
            rating: getRating('LCP', value),
            id: `lcp-${Date.now()}`,
          });
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP not supported
    }

    // FID - First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const firstInputEntry = entry as PerformanceEntry & { processingStart?: number };
          const value = (firstInputEntry.processingStart ?? 0) - entry.startTime;
          reportMetric({
            name: 'FID',
            value,
            rating: getRating('FID', value),
            id: `fid-${Date.now()}`,
          });
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID not supported
    }
  }

  // FCP - First Contentful Paint (using Performance Timeline)
  const paintEntries = performance.getEntriesByType('paint');
  const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
  if (fcpEntry) {
    reportMetric({
      name: 'FCP',
      value: fcpEntry.startTime,
      rating: getRating('FCP', fcpEntry.startTime),
      id: `fcp-${Date.now()}`,
    });
  }

  // TTFB - Time to First Byte
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (navEntry) {
    const ttfb = navEntry.responseStart - navEntry.startTime;
    reportMetric({
      name: 'TTFB',
      value: ttfb,
      rating: getRating('TTFB', ttfb),
      id: `ttfb-${Date.now()}`,
    });
  }
}

/**
 * Performance monitor hook for tracking page-level metrics.
 */
export function usePerformanceMonitor() {
  const pathname = usePathname();

  useEffect(() => {
    // Wait for page to be fully loaded
    if (document.readyState === 'complete') {
      observeWebVitals();
    } else {
      window.addEventListener('load', observeWebVitals);
      return () => window.removeEventListener('load', observeWebVitals);
    }
  }, [pathname]);
}

/**
 * Performance Monitor Component
 * 
 * Include this in your root layout to track metrics across all pages.
 */
export function PerformanceMonitor() {
  usePerformanceMonitor();
  return null;
}
