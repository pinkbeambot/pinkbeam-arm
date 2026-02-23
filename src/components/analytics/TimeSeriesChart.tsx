'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import type { TimeSeriesData } from '@/types/advanced-analytics';

type ChartType = 'line' | 'area' | 'bar';

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title: string;
  description?: string;
  type?: ChartType;
  showTrendLine?: boolean;
  showPrediction?: boolean;
  valueFormatter?: (value: number) => string;
  yAxisLabel?: string;
  isLoading?: boolean;
  className?: string;
  height?: number;
  onTypeChange?: (type: ChartType) => void;
}

export function TimeSeriesChart({
  data,
  title,
  description,
  type = 'area',
  showTrendLine = true,
  showPrediction = true,
  valueFormatter = (v) => formatNumber(v),
  yAxisLabel,
  isLoading,
  className,
  height = 250,
  onTypeChange,
}: TimeSeriesChartProps) {
  const [chartType, setChartType] = useState<ChartType>(type);

  if (isLoading) {
    return <TimeSeriesSkeleton title={title} className={className} height={height} />;
  }

  if (!data || data.length === 0) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] flex-col items-center justify-center text-center text-muted-foreground">
            <Activity className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate trend line using linear regression
  const trendData = useMemo(() => {
    if (!showTrendLine) return data;
    
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, d) => sum + d.value, 0);
    const sumXY = data.reduce((sum, d, i) => sum + i * d.value, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return data.map((d, i) => ({
      ...d,
      trendLine: slope * i + intercept,
    }));
  }, [data, showTrendLine]);

  // Calculate statistics
  const stats = useMemo(() => {
    const values = data.map(d => d.value);
    const current = values[values.length - 1] || 0;
    const previous = values[values.length - 2] || 0;
    const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return { current, change, avg, max, min };
  }, [data]);

  const handleTypeChange = (value: string) => {
    const newType = value as ChartType;
    setChartType(newType);
    onTypeChange?.(newType);
  };

  const renderChart = () => {
    const commonProps = {
      data: trendData,
      margin: { top: 10, right: 10, left: 0, bottom: 0 },
    };

    const commonAxisProps = {
      xAxis: {
        dataKey: 'date',
        tickFormatter: (value: string) => {
          const date = new Date(value);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
        tick: { fontSize: 11 },
        axisLine: false,
        tickLine: false,
      },
      yAxis: {
        tickFormatter: valueFormatter,
        tick: { fontSize: 11 },
        axisLine: false,
        tickLine: false,
        width: 50,
      },
    };

    const tooltipStyle = {
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '6px',
      fontSize: '12px',
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            <Tooltip 
              contentStyle={tooltipStyle} 
              formatter={(value) => [valueFormatter(value as number), "Value"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            {showTrendLine && (
              <Line 
                type="monotone" 
                dataKey="trendLine" 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5" 
                dot={false}
                strokeWidth={1}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ r: 3, fill: 'hsl(var(--primary))' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            <Tooltip 
              contentStyle={tooltipStyle} 
              formatter={(value) => [valueFormatter(value as number), "Value"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        );

      case 'area':
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
              {showPrediction && (
                <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis {...commonAxisProps.xAxis} />
            <YAxis {...commonAxisProps.yAxis} />
            <Tooltip 
              contentStyle={tooltipStyle} 
              formatter={(value) => [valueFormatter(value as number), "Value"]}
              labelFormatter={(label) => new Date(label).toLocaleDateString()}
            />
            {showTrendLine && (
              <Line 
                type="monotone" 
                dataKey="trendLine" 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5" 
                dot={false}
                strokeWidth={1}
              />
            )}
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
              strokeWidth={2}
            />
            {showPrediction && trendData.some(d => d.predicted !== undefined) && (
              <Area 
                type="monotone" 
                dataKey="predicted" 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                fillOpacity={1} 
                fill="url(#colorPredicted)" 
                strokeWidth={1}
              />
            )}
          </AreaChart>
        );
    }
  };

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              {title}
              {stats.change !== 0 && (
                <span className={cn(
                  'text-xs font-normal px-2 py-0.5 rounded-full flex items-center gap-1',
                  stats.change > 0 ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                )}>
                  {stats.change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(stats.change).toFixed(1)}%
                </span>
              )}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          <Select value={chartType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="area">Area</SelectItem>
              <SelectItem value="line">Line</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatBox label="Current" value={valueFormatter(stats.current)} />
          <StatBox label="Average" value={valueFormatter(stats.avg)} />
          <StatBox label="Peak" value={valueFormatter(stats.max)} />
        </div>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function TimeSeriesSkeleton({ title, className, height = 250 }: { title: string; className?: string; height?: number }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-6 w-12 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="w-full" style={{ height }} />
      </CardContent>
    </Card>
  );
}

// Need to import useState
import { useState } from 'react';
