'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Cpu, 
  MemoryStick, 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { LiveSparkline } from './LiveLineChart';
import type { AgentMetricsCardProps, AgentLiveMetrics } from './types';

// ============================================================================
// Status Helpers
// ============================================================================

function getStatusColor(status: AgentLiveMetrics['status']): string {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'idle':
      return 'bg-blue-500';
    case 'paused':
      return 'bg-amber-500';
    case 'error':
      return 'bg-red-500';
    default:
      return 'bg-gray-500';
  }
}

function getStatusLabel(status: AgentLiveMetrics['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getTrendIcon(current: number, previous: number) {
  const diff = current - previous;
  if (diff > 0.1) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (diff < -0.1) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

// ============================================================================
// AgentMetricsCard Component
// ============================================================================

export function AgentMetricsCard({
  agent,
  isSelected = false,
  onClick,
  className,
}: AgentMetricsCardProps) {
  const successRateColor = agent.successRate >= 95 ? 'text-green-500' : 
                           agent.successRate >= 80 ? 'text-amber-500' : 'text-red-500';
  
  const loadColor = agent.currentLoad < 50 ? 'text-green-500' : 
                    agent.currentLoad < 80 ? 'text-amber-500' : 'text-red-500';

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:border-primary/50',
        isSelected && 'ring-2 ring-primary border-primary',
        className
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Status indicator */}
          <div className={cn('w-3 h-3 rounded-full animate-pulse', getStatusColor(agent.status))} />
          
          <div>
            <h3 className="font-semibold text-foreground">{agent.agentName}</h3>
            <p className="text-xs text-muted-foreground">{agent.agentId}</p>
          </div>
        </div>
        
        <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>
          {getStatusLabel(agent.status)}
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Tasks per minute */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Zap className="w-3.5 h-3.5" />
            Tasks/min
          </div>
          <p className="text-lg font-semibold">{agent.tasksPerMinute.toFixed(1)}</p>
        </div>

        {/* Success rate */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Success Rate
          </div>
          <p className={cn('text-lg font-semibold', successRateColor)}>
            {agent.successRate.toFixed(1)}%
          </p>
        </div>

        {/* Current load */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Activity className="w-3.5 h-3.5" />
            Load
          </div>
          <div className="flex items-center gap-2">
            <Progress value={agent.currentLoad} className="h-2 flex-1" />
            <span className={cn('text-sm font-medium', loadColor)}>
              {agent.currentLoad.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Response time */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            Avg Response
          </div>
          <p className="text-lg font-semibold">{agent.avgResponseTime.toFixed(0)}ms</p>
        </div>
      </div>

      {/* Resource usage */}
      {(agent.cpuUsage !== undefined || agent.memoryUsage !== undefined) && (
        <div className="flex items-center gap-4 pt-3 border-t border-border/50">
          {agent.cpuUsage !== undefined && (
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">CPU</span>
              <Progress value={agent.cpuUsage} className="w-16 h-1.5" />
              <span className="text-xs text-muted-foreground">{agent.cpuUsage.toFixed(0)}%</span>
            </div>
          )}
          {agent.memoryUsage !== undefined && (
            <div className="flex items-center gap-2">
              <MemoryStick className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">MEM</span>
              <Progress value={agent.memoryUsage} className="w-16 h-1.5" />
              <span className="text-xs text-muted-foreground">{agent.memoryUsage.toFixed(0)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Error rate warning */}
      {agent.errorRate > 5 && (
        <div className="flex items-center gap-2 mt-3 p-2 rounded-md bg-red-500/10 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>High error rate: {agent.errorRate.toFixed(1)}%</span>
        </div>
      )}

      {/* Last activity */}
      <p className="text-xs text-muted-foreground mt-3">
        Last activity: {new Date(agent.lastActivityAt).toLocaleTimeString()}
      </p>
    </Card>
  );
}

// ============================================================================
// AgentMetricsCompact (List view variant)
// ============================================================================

interface AgentMetricsCompactProps {
  agent: AgentLiveMetrics;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
  sparklineData?: number[];
}

export function AgentMetricsCompact({
  agent,
  isSelected = false,
  onClick,
  className,
  sparklineData,
}: AgentMetricsCompactProps) {
  const statusColor = getStatusColor(agent.status);

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all',
        'hover:bg-muted/50',
        isSelected && 'bg-muted border-primary',
        className
      )}
      onClick={onClick}
    >
      {/* Status */}
      <div className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', statusColor)} />

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{agent.agentName}</p>
        <p className="text-xs text-muted-foreground truncate">{agent.agentId}</p>
      </div>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="w-20 h-8">
          <LiveSparkline
            data={sparklineData.map((v, i) => ({ timestamp: i, value: v }))}
            color={agent.successRate > 90 ? '#22c55e' : '#eab308'}
            height={32}
          />
        </div>
      )}

      {/* Key metric */}
      <div className="text-right">
        <p className={cn(
          'text-sm font-semibold',
          agent.successRate >= 95 ? 'text-green-500' : 
          agent.successRate >= 80 ? 'text-amber-500' : 'text-red-500'
        )}>
          {agent.successRate.toFixed(0)}%
        </p>
        <p className="text-xs text-muted-foreground">success</p>
      </div>

      {/* Load indicator */}
      <div className="w-16">
        <Progress value={agent.currentLoad} className="h-1.5" />
        <p className="text-xs text-muted-foreground text-center mt-1">
          {agent.currentLoad.toFixed(0)}%
        </p>
      </div>
    </div>
  );
}
