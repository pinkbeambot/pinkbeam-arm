'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Clock,
  ChevronRight,
  User,
  Link2,
  Layers,
  AlertCircle,
} from 'lucide-react';
import type { Bottleneck } from './types';

interface BottleneckVisualizationProps {
  bottlenecks: Bottleneck[];
  className?: string;
  onBottleneckClick?: (bottleneck: Bottleneck) => void;
}

const severityConfig = {
  critical: { 
    color: 'text-red-600', 
    bg: 'bg-red-50 dark:bg-red-950/20', 
    border: 'border-red-200 dark:border-red-800',
    badge: 'destructive',
    icon: AlertCircle,
  },
  high: { 
    color: 'text-amber-600', 
    bg: 'bg-amber-50 dark:bg-amber-950/20', 
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'secondary',
    icon: AlertTriangle,
  },
  medium: { 
    color: 'text-blue-600', 
    bg: 'bg-blue-50 dark:bg-blue-950/20', 
    border: 'border-blue-200 dark:border-blue-800',
    badge: 'outline',
    icon: Clock,
  },
  low: { 
    color: 'text-gray-600', 
    bg: 'bg-gray-50 dark:bg-gray-950/20', 
    border: 'border-gray-200 dark:border-gray-800',
    badge: 'outline',
    icon: Clock,
  },
};

const typeIcons = {
  agent: User,
  stage: Layers,
  dependency: Link2,
};

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function BottleneckVisualization({ 
  bottlenecks, 
  className,
  onBottleneckClick 
}: BottleneckVisualizationProps) {
  // Sort by severity (critical first)
  const sortedBottlenecks = [...bottlenecks].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Bottlenecks & Issues
          </CardTitle>
          <Badge variant="outline">
            {bottlenecks.length} identified
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedBottlenecks.map((bottleneck) => {
            const config = severityConfig[bottleneck.severity];
            const TypeIcon = typeIcons[bottleneck.type];
            const SeverityIcon = config.icon;

            return (
              <div
                key={bottleneck.id}
                className={cn(
                  "relative p-4 rounded-lg border transition-all cursor-pointer",
                  "hover:shadow-md",
                  config.bg,
                  config.border
                )}
                onClick={() => onBottleneckClick?.(bottleneck)}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
                    "bg-background/80"
                  )}>
                    <TypeIcon className={cn("h-5 w-5", config.color)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground">{bottleneck.name}</h4>
                      <Badge 
                        variant={config.badge as 'default' | 'destructive' | 'outline' | 'secondary'}
                        className="text-xs capitalize"
                      >
                        {bottleneck.severity}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-1">
                      {bottleneck.description}
                    </p>

                    {/* Metrics */}
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{bottleneck.tasksAffected}</span>
                        <span className="text-muted-foreground">tasks affected</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatTime(bottleneck.avgWaitTime)}</span>
                        <span className="text-muted-foreground">avg wait</span>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="mt-3 p-3 bg-background/60 rounded-md">
                      <p className="text-xs text-muted-foreground">
                        <strong>Recommendation:</strong> {bottleneck.recommendation}
                      </p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
                </div>
              </div>
            );
          })}
        </div>

        {bottlenecks.length === 0 && (
          <div className="text-center py-8">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-3">
              <CheckIcon className="h-6 w-6 text-green-600" />
            </div>
            <p className="font-medium text-foreground">No bottlenecks detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your AI workforce is running smoothly
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
