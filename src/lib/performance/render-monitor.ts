/**
 * Render Performance Monitor
 * 
 * Tracks React component render times and identifies slow renders.
 * Only active in development mode.
 */

'use client';

import { useEffect, useRef } from 'react';

interface RenderMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

const SLOW_RENDER_THRESHOLD = 16; // 16ms = 60fps
const MAX_STORED_METRICS = 100;

const renderMetrics: RenderMetric[] = [];

function recordRender(componentName: string, renderTime: number) {
  const metric: RenderMetric = {
    componentName,
    renderTime,
    timestamp: Date.now(),
  };

  renderMetrics.push(metric);
  
  if (renderMetrics.length > MAX_STORED_METRICS) {
    renderMetrics.shift();
  }

  // Log slow renders in development
  if (process.env.NODE_ENV === 'development' && renderTime > SLOW_RENDER_THRESHOLD) {
    console.warn(`[Slow Render] ${componentName}: ${renderTime.toFixed(2)}ms`);
  }
}

export function getRenderMetrics(): RenderMetric[] {
  return [...renderMetrics];
}

export function getSlowRenders(threshold: number = SLOW_RENDER_THRESHOLD): RenderMetric[] {
  return renderMetrics.filter(m => m.renderTime > threshold);
}

export function clearRenderMetrics() {
  renderMetrics.length = 0;
}

/**
 * Hook to measure component render time
 */
export function useRenderMonitor(componentName: string) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef(0);

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return;

    renderCount.current += 1;
    const renderTime = performance.now() - renderStartTime.current;
    
    recordRender(componentName, renderTime);
  });

  renderStartTime.current = performance.now();
}

/**
 * Higher-order component for monitoring wrapped components
 */
export function withRenderMonitor<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.FC<P> {
  const MonitoredComponent: React.FC<P> = (props) => {
    useRenderMonitor(componentName);
    return <Component {...props} />;
  };

  MonitoredComponent.displayName = `withRenderMonitor(${componentName})`;
  return MonitoredComponent;
}

/**
 * Component to display render performance stats
 */
export function RenderPerformancePanel() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      const slowRenders = getSlowRenders();
      if (slowRenders.length > 0) {
        console.group('[Render Performance] Slow Renders');
        const grouped = slowRenders.reduce((acc, metric) => {
          acc[metric.componentName] = (acc[metric.componentName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        Object.entries(grouped)
          .sort(([, a], [, b]) => b - a)
          .forEach(([name, count]) => {
            console.log(`${name}: ${count} slow renders`);
          });
        console.groupEnd();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
