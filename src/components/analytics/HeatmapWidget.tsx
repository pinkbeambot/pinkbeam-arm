'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Activity, Clock, Calendar } from 'lucide-react';
import { useState } from 'react';
import type { ActivityHeatmapData, HeatmapCell } from '@/types/advanced-analytics';

interface HeatmapWidgetProps {
  data?: ActivityHeatmapData;
  isLoading?: boolean;
  className?: string;
  onTypeChange?: (type: 'hourly' | 'daily' | 'weekly') => void;
}

export function HeatmapWidget({
  data,
  isLoading,
  className,
  onTypeChange,
}: HeatmapWidgetProps) {
  const [selectedType, setSelectedType] = useState<'hourly' | 'daily' | 'weekly'>('hourly');

  if (isLoading) {
    return <HeatmapSkeleton className={className} />;
  }

  if (!data || data.cells.length === 0) {
    return (
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            Activity Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 flex-col items-center justify-center text-center text-muted-foreground">
            <Activity className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No activity data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleTypeChange = (value: string) => {
    const type = value as 'hourly' | 'daily' | 'weekly';
    setSelectedType(type);
    onTypeChange?.(type);
  };

  const typeLabels = {
    hourly: { label: 'Hourly', icon: Clock, description: 'Activity by hour of day' },
    daily: { label: 'Daily', icon: Calendar, description: 'Activity by day and category' },
    weekly: { label: 'Weekly', icon: Activity, description: 'Weekly metrics comparison' },
  };

  const currentType = typeLabels[selectedType];
  const TypeIcon = currentType.icon;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TypeIcon className="h-4 w-4 text-primary" />
              Activity Heatmap
            </CardTitle>
            <CardDescription>{currentType.description}</CardDescription>
          </div>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">Hourly</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <HeatmapGrid data={data} />
      </CardContent>
    </Card>
  );
}

function HeatmapGrid({ data }: { data: ActivityHeatmapData }) {
  const { cells, xLabels, yLabels, maxValue, minValue } = data;

  // Create a grid from cells
  const grid: (HeatmapCell | null)[][] = yLabels.map(y => 
    xLabels.map(x => {
      return cells.find(c => c.x === x && c.y === y) || null;
    })
  );

  // Calculate color intensity
  const getColorClass = (value: number, max: number): string => {
    if (max === 0) return 'bg-gray-100';
    const ratio = value / max;
    if (ratio === 0) return 'bg-gray-100';
    if (ratio < 0.25) return 'bg-indigo-100';
    if (ratio < 0.5) return 'bg-indigo-200';
    if (ratio < 0.75) return 'bg-indigo-300';
    return 'bg-indigo-500';
  };

  const getTextClass = (value: number, max: number): string => {
    if (max === 0) return 'text-gray-400';
    const ratio = value / max;
    if (ratio < 0.5) return 'text-gray-700';
    return 'text-white';
  };

  return (
    <div className="space-y-2">
      {/* Y-axis labels and grid */}
      <div className="flex gap-1">
        {/* Y labels column */}
        <div className="flex flex-col gap-1 pr-2">
          {yLabels.map((label) => (
            <div 
              key={label} 
              className="h-8 flex items-center justify-end text-xs text-muted-foreground whitespace-nowrap"
              style={{ width: '60px' }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-x-auto">
          <div 
            className="grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${xLabels.length}, minmax(30px, 1fr))`,
            }}
          >
            {grid.flat().map((cell, index) => (
              <div
                key={index}
                className={cn(
                  'h-8 rounded flex items-center justify-center text-xs font-medium transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer',
                  cell ? getColorClass(cell.value, maxValue) : 'bg-gray-50',
                  cell ? getTextClass(cell.value, maxValue) : 'text-gray-300'
                )}
                title={cell ? `${cell.y} ${cell.x}: ${cell.value}` : 'No data'}
              >
                {cell && cell.value > 0 && cell.value >= maxValue * 0.5 ? cell.value : ''}
              </div>
            ))}
          </div>

          {/* X-axis labels */}
          <div 
            className="grid gap-1 mt-1"
            style={{
              gridTemplateColumns: `repeat(${xLabels.length}, minmax(30px, 1fr))`,
            }}
          >
            {xLabels.map((label) => (
              <div 
                key={label} 
                className="text-xs text-muted-foreground text-center truncate"
                title={label}
              >
                {label.length > 3 ? label.slice(0, 2) : label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Low</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 rounded bg-gray-100" />
            <div className="w-4 h-4 rounded bg-indigo-100" />
            <div className="w-4 h-4 rounded bg-indigo-200" />
            <div className="w-4 h-4 rounded bg-indigo-300" />
            <div className="w-4 h-4 rounded bg-indigo-500" />
          </div>
          <span className="text-xs text-muted-foreground">High</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Max: {maxValue}
        </div>
      </div>
    </div>
  );
}

function HeatmapSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-9 w-28" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-14" />
              ))}
            </div>
            <div className="flex-1 grid grid-cols-12 gap-1">
              {Array.from({ length: 84 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
