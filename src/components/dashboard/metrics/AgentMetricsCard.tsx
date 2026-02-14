/**
 * Agent Metrics Card Component
 * 
 * Displays live metrics for a single agent including:
 * - Status indicator
 * - Tasks per minute
 * - Success rate with mini chart
 * - Current load/CPU
 * - Error rate
 */

'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import type { AgentMetricsCardProps } from './types';
import type { AgentLiveMetrics } from './types';

// Status configuration
const statusConfig: Record<string, { color: string; label: string; icon: typeof Activity }> = {
  initializing: { color: 'bg-blue-500', label: 'Initializing', icon: Clock },
  idle: { color: 'bg-slate-400', label: 'Idle', icon: Clock },
  active: { color: 'bg-green-500', label: 'Active', icon: Activity },
  paused: { color: 'bg-amber-500', label: 'Paused', icon: Clock },
  blocked: { color: 'bg-orange-500', label: 'Blocked', icon: AlertTriangle },
  error: { color: 'bg-red-500', label: 'Error', icon: XCircle },
  escaped: { color: 'bg-purple-500', label: 'Escaped', icon: AlertTriangle },
  terminated: { color: 'bg-slate-600', label: 'Terminated', icon: XCircle },
};

// Mock trend data (in real implementation, this would come from the API)
function generateTrendData(successRate: number): { value: number }[] {
  return Array.from({ length: 20 }, () => ({
    value: successRate + (Math.random() - 0.5) * 10,
  }));
}

export function AgentMetricsCard({
  agent,
  isSelected = false,
  onClick,
  className,
}: AgentMetricsCardProps) {
  const status = statusConfig[agent.status] || statusConfig.idle;
  const StatusIcon = status.icon;
  const trendData = generateTrendData(agent.successRate);

  // Determine health color based on success rate
  const getHealthColor = (rate: number): string => {
    if (rate >= 95) return '#22c55e'; // green
    if (rate >= 80) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200",
        isSelected && "ring-2 ring-pink-500 shadow-lg",
        onClick && "hover:shadow-md hover:border-pink-200",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full animate-pulse", status.color)} />
            <span className="font-semibold text-sm truncate max-w-[120px]">
              {agent.agentName}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            <StatusIcon className="w-3 h-3 mr-1" />
            {status.label}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Tasks per minute */}
          <div>
            <p className="text-xs text-muted-foreground">Tasks/min</p>
            <p className="text-lg font-semibold">{agent.tasksPerMinute.toFixed(1)}</p>
          </div>

          {/* Success Rate with Mini Chart */}
          <div>
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">
                {agent.successRate.toFixed(0)}%
              </span>
              <div className="w-12 h-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={getHealthColor(agent.successRate)}
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Load Bar */}
        <div className="space-y-1 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              Load
            </span>
            <span className="font-medium">{agent.currentLoad.toFixed(0)}%</span>
          </div>
          <Progress 
            value={agent.currentLoad} 
            className="h-1.5"
          />
        </div>

        {/* Footer Stats */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{Math.round(agent.avgResponseTime)}ms</span>
          </div>
          
          {agent.errorRate > 0 && (
            <div className="flex items-center gap-1 text-red-500">
              <XCircle className="w-3 h-3" />
              <span>{agent.errorRate.toFixed(1)}% errors</span>
            </div>
          )}
          
          {agent.errorRate === 0 && (
            <div className="flex items-center gap-1 text-green-500">
              <CheckCircle2 className="w-3 h-3" />
              <span>No errors</span>
            </div>
          )}
        </div>

        {/* Last Activity */}
        <p className="text-xs text-muted-foreground mt-2 truncate">
          Last active: {new Date(agent.lastActivityAt).toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Compact Agent Card for use in lists
 */
export function AgentMetricsCompact({
  agent,
  isSelected = false,
  onClick,
  className,
}: AgentMetricsCardProps) {
  const status = statusConfig[agent.status] || statusConfig.idle;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all",
        isSelected && "border-pink-500 bg-pink-50",
        !isSelected && "hover:bg-slate-50",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn("w-2 h-2 rounded-full", status.color)} />
        <div>
          <p className="font-medium text-sm">{agent.agentName}</p>
          <p className="text-xs text-muted-foreground">{status.label}</p>
        </div>
      </div>
      
      <div className="text-right">
        <p className="font-semibold text-sm">{agent.tasksPerMinute.toFixed(1)}/min</p>
        <p className={cn(
          "text-xs",
          agent.successRate >= 95 ? "text-green-500" : 
          agent.successRate >= 80 ? "text-amber-500" : "text-red-500"
        )}>
          {agent.successRate.toFixed(0)}% success
        </p>
      </div>
    </div>
  );
}
