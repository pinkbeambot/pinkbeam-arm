'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { MetricCardData } from './types';

interface MetricCardProps {
  data: MetricCardData;
  className?: string;
}

function formatValue(value: number | string, format?: string): string {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'time':
      return `${value.toFixed(1)}m`;
    default:
      return new Intl.NumberFormat('en-US').format(value);
  }
}

export function MetricCard({ data, className }: MetricCardProps) {
  const { title, value, change, changeLabel, trend, format } = data;
  
  const isPositiveChange = change > 0;
  const isNegativeChange = change < 0;
  const isNeutral = change === 0;
  
  // For metrics where lower is better (like time, escalations)
  const isInvertedMetric = title.toLowerCase().includes('time') || 
                           title.toLowerCase().includes('escalation') ||
                           title.toLowerCase().includes('cost');
  
  const isGoodChange = isInvertedMetric ? change < 0 : change > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">
              {title}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">
                {formatValue(value, format)}
              </span>
            </div>
            
            {/* Change Indicator */}
            <div className="mt-2 flex items-center gap-1.5">
              {isNeutral ? (
                <Minus className="h-4 w-4 text-muted-foreground" />
              ) : isPositiveChange ? (
                <TrendingUp className={cn(
                  "h-4 w-4",
                  isGoodChange ? "text-green-500" : "text-red-500"
                )} />
              ) : (
                <TrendingDown className={cn(
                  "h-4 w-4",
                  isGoodChange ? "text-green-500" : "text-red-500"
                )} />
              )}
              <span className={cn(
                "text-sm font-medium",
                isNeutral ? "text-muted-foreground" :
                isGoodChange ? "text-green-600" : "text-red-600"
              )}>
                {isPositiveChange ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-sm text-muted-foreground">
                {changeLabel}
              </span>
            </div>
          </div>
          
          {/* Sparkline Chart */}
          {trend && trend.length > 0 && (
            <div className="w-24 h-12 ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={isGoodChange ? "#22c55e" : change < 0 ? "#ef4444" : "#6b7280"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-lg border">
                            {formatValue(payload[0].value as number, format)}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
