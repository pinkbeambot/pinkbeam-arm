'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import type { LiveLineChartProps, LiveMetricPoint } from './types';

// ============================================================================
// LiveLineChart Component
// ============================================================================

export function LiveLineChart({
  data,
  title,
  valueFormatter = (v) => v.toFixed(1),
  color = '#3b82f6',
  yAxisMin,
  yAxisMax,
  showArea = true,
  className,
  height = 200,
}: LiveLineChartProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);

  // Measure container width
  React.useEffect(() => {
    if (!svgRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    
    observer.observe(svgRef.current.parentElement!);
    
    return () => observer.disconnect();
  }, []);

  // Calculate chart dimensions
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = Math.max(0, containerWidth - padding.left - padding.right);
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const values = data.map(d => d.value);
  const minValue = yAxisMin ?? Math.min(...values, 0);
  const maxValue = yAxisMax ?? Math.max(...values, minValue + 1);
  const valueRange = maxValue - minValue || 1;

  const getX = (index: number) => {
    if (data.length <= 1) return 0;
    return (index / (data.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    return chartHeight - ((value - minValue) / valueRange) * chartHeight;
  };

  // Generate path
  const pathData = data.map((point, i) => {
    const x = getX(i);
    const y = getY(point.value);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  // Generate area path
  const areaPath = showArea && data.length > 0
    ? `${pathData} L ${getX(data.length - 1)} ${chartHeight} L 0 ${chartHeight} Z`
    : '';

  // Generate Y-axis ticks
  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minValue + (valueRange * i) / yTicks
  );

  // Current value (latest)
  const currentValue = data[data.length - 1]?.value ?? 0;

  return (
    <Card className={cn('p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <span
          className="text-lg font-bold"
          style={{ color }}
        >
          {valueFormatter(currentValue)}
        </span>
      </div>

      {/* Chart */}
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        className="overflow-visible"
      >
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yTickValues.map((tick, i) => (
            <line
              key={i}
              x1={0}
              x2={chartWidth}
              y1={getY(tick)}
              y2={getY(tick)}
              stroke="currentColor"
              strokeOpacity={0.1}
              className="text-muted-foreground"
            />
          ))}

          {/* Y-axis */}
          <line
            x1={0}
            x2={0}
            y1={0}
            y2={chartHeight}
            stroke="currentColor"
            strokeOpacity={0.2}
            className="text-muted-foreground"
          />

          {/* X-axis */}
          <line
            x1={0}
            x2={chartWidth}
            y1={chartHeight}
            y2={chartHeight}
            stroke="currentColor"
            strokeOpacity={0.2}
            className="text-muted-foreground"
          />

          {/* Y-axis labels */}
          {yTickValues.map((tick, i) => (
            <text
              key={i}
              x={-10}
              y={getY(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="currentColor"
              className="text-muted-foreground"
            >
              {valueFormatter(tick)}
            </text>
          ))}

          {/* Area fill */}
          {showArea && areaPath && (
            <path
              d={areaPath}
              fill={color}
              fillOpacity={0.1}
            />
          )}

          {/* Line */}
          {data.length > 0 && (
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {data.map((point, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(point.value)}
              r={i === data.length - 1 ? 4 : 2}
              fill={color}
              className={i === data.length - 1 ? 'animate-pulse' : ''}
            />
          ))}
        </g>
      </svg>

      {/* Time labels */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-2">
        <span>-5m</span>
        <span>-2.5m</span>
        <span>Now</span>
      </div>
    </Card>
  );
}

// ============================================================================
// LiveSparkline (Compact variant)
// ============================================================================

interface LiveSparklineProps {
  data: LiveMetricPoint[];
  color?: string;
  height?: number;
  className?: string;
}

export function LiveSparkline({
  data,
  color = '#3b82f6',
  height = 40,
  className,
}: LiveSparklineProps) {
  if (data.length === 0) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d.value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
