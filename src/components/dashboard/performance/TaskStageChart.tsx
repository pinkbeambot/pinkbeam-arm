'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TaskStageMetrics } from './types';

interface TaskStageChartProps {
  stages: TaskStageMetrics[];
  className?: string;
}

const stageColors = {
  'Queued': '#94a3b8',
  'In Progress': '#3b82f6',
  'Needs Review': '#f59e0b',
  'Completed': '#22c55e',
};

export function TaskStageChart({ stages, className }: TaskStageChartProps) {
  const totalTasks = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Task Pipeline Flow</CardTitle>
          <Badge variant="outline">{totalTasks.toLocaleString()} total</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stages} layout="vertical" margin={{ left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis 
                dataKey="stage" 
                type="category" 
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const stage = stages.find(s => s.stage === label);
                    return (
                      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border text-sm">
                        <p className="font-medium">{label}</p>
                        <p className="text-muted-foreground mt-1">
                          Count: <span className="font-medium text-foreground">{payload[0].value}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Avg Time: <span className="font-medium text-foreground">
                            {stage ? formatTime(stage.avgTime) : '--'}
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {stages.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={stageColors[entry.stage as keyof typeof stageColors] || '#8884d8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t">
          {stages.map((stage) => (
            <div key={stage.stage} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: stageColors[stage.stage as keyof typeof stageColors] || '#8884d8'
                }}
              />
              <span className="text-sm text-muted-foreground">{stage.stage}</span>
              <span className="text-sm font-medium">({stage.count})</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
