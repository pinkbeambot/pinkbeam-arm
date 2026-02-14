/**
 * Live Line Chart Component
 * 
 * A real-time updating line chart for metrics visualization.
 * Features:
 * - Smooth animations for new data points
 * - Configurable value formatting
 * - Optional area fill
 * - Automatic scaling
 * - Custom colors
 */

'use client';

import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LiveLineChartProps, LiveMetricPoint } from './types';

// Re-export the props type for consumers
export type { LiveSparklineProps };

// ============================================================================
// LiveSparkline Component (Compact variant)
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

// ============================================================================
// LiveLineChart Component
// ============================================================================

interface ChartDataPoint {
  timestamp: number;
  value: number;
  label: string;
}

export function LiveLineChart({
  data,
  title,
  valueFormatter = (v) => v.toFixed(1),
  color = '#ec4899', // Pink beam color
  yAxisMin,
  yAxisMax,
  showArea = true,
  className,
  height = 200,
}: LiveLineChartProps) {
  // Transform data for Recharts
  const chartData: ChartDataPoint[] = React.useMemo(() => {
    return data.map((point) => ({
      timestamp: point.timestamp,
      value: point.value,
      label: point.label || new Date(point.timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    }));
  }, [data]);

  // Calculate current value
  const currentValue = chartData.length > 0 
    ? chartData[chartData.length - 1].value 
    : 0;

  // Calculate trend
  const previousValue = chartData.length > 1 
    ? chartData[chartData.length - 2].value 
    : currentValue;
  
  const trend = currentValue - previousValue;
  const trendPercent = previousValue !== 0 ? (trend / previousValue) * 100 : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold" style={{ color }}>
            {valueFormatter(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Determine domain
  const domainMin = yAxisMin !== undefined ? yAxisMin : 'auto';
  const domainMax = yAxisMax !== undefined ? yAxisMax : 'auto';

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color }}>
              {valueFormatter(currentValue)}
            </span>
            {trend !== 0 && (
              <span className={cn(
                "text-xs font-medium",
                trend > 0 ? "text-green-500" : "text-red-500"
              )}>
                {trend > 0 ? '+' : ''}{trendPercent.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={height}>
          {showArea ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => valueFormatter(value)}
                domain={[domainMin, domainMax]}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </AreaChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => valueFormatter(value)}
                domain={[domainMin, domainMax]}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: color }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
