'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Database,
  Wifi,
  Server,
  HardDrive,
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { 
  SystemHealthIndicatorProps, 
  HealthStatusBadgeProps, 
  SystemHealthMetrics 
} from './types';

// ============================================================================
// HealthStatusBadge Component
// ============================================================================

export function HealthStatusBadge({
  status,
  label,
  showIcon = true,
  size = 'md',
}: HealthStatusBadgeProps) {
  const config = {
    healthy: {
      icon: CheckCircle2,
      className: 'bg-green-500/10 text-green-600 border-green-500/20',
      label: label || 'Healthy',
    },
    degraded: {
      icon: AlertTriangle,
      className: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      label: label || 'Degraded',
    },
    critical: {
      icon: XCircle,
      className: 'bg-red-500/10 text-red-600 border-red-500/20',
      label: label || 'Critical',
    },
    unknown: {
      icon: HelpCircle,
      className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
      label: label || 'Unknown',
    },
  };

  const { icon: Icon, className, label: defaultLabel } = config[status];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>{defaultLabel}</span>
    </span>
  );
}

// ============================================================================
// SystemHealthIndicator Component
// ============================================================================

export function SystemHealthIndicator({
  health,
  showDetails = true,
  className,
}: SystemHealthIndicatorProps) {
  const [expanded, setExpanded] = React.useState(false);

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatBytes = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(0)} MB`;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center',
              health.status === 'healthy' ? 'bg-green-500/10' :
              health.status === 'degraded' ? 'bg-amber-500/10' :
              health.status === 'critical' ? 'bg-red-500/10' :
              'bg-gray-500/10'
            )}>
              <Activity className={cn(
                'w-5 h-5',
                health.status === 'healthy' ? 'text-green-500' :
                health.status === 'degraded' ? 'text-amber-500' :
                health.status === 'critical' ? 'text-red-500' :
                'text-gray-500'
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">System Health</h3>
              <p className="text-xs text-muted-foreground">
                Uptime: {formatDuration(health.uptime)}
              </p>
            </div>
          </div>
          
          <HealthStatusBadge status={health.status} />
        </div>
      </div>

      {/* Overview metrics */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Database */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Database</span>
          </div>
          <HealthStatusBadge status={health.database.status} size="sm" />
          <p className="text-xs text-muted-foreground">
            {health.database.responseTime.toFixed(1)}ms response
          </p>
        </div>

        {/* Realtime */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Realtime</span>
          </div>
          <HealthStatusBadge status={health.realtime.status} size="sm" />
          <p className="text-xs text-muted-foreground">
            {health.realtime.connections} connections
          </p>
        </div>

        {/* Agent Runtime */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Runtime</span>
          </div>
          <HealthStatusBadge status={health.agentRuntime.status} size="sm" />
          <p className="text-xs text-muted-foreground">
            {health.agentRuntime.activeAgents} active agents
          </p>
        </div>

        {/* Resources */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Resources</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              'text-sm font-medium',
              health.resources.cpu.usage > 80 ? 'text-red-500' :
              health.resources.cpu.usage > 60 ? 'text-amber-500' :
              'text-green-500'
            )}>
              {health.resources.cpu.usage.toFixed(0)}%
            </span>
            <span className="text-xs text-muted-foreground">CPU</span>
          </div>
          <Progress 
            value={health.resources.cpu.usage} 
            className="h-1"
          />
        </div>
      </div>

      {/* Detailed view */}
      {showDetails && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors border-t border-border/50"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show details
              </>
            )}
          </button>

          {expanded && (
            <div className="p-4 border-t border-border/50 space-y-4">
              {/* Database Details */}
              <div>
                <h4 className="text-sm font-medium mb-3">Database Details</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Response Time</p>
                    <p className="font-medium">{health.database.responseTime.toFixed(1)}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Connection Pool</p>
                    <p className="font-medium">
                      {health.database.connectionPool.used} / {health.database.connectionPool.total}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pool Utilization</p>
                    <p className="font-medium">{health.database.connectionPool.utilization.toFixed(0)}%</p>
                  </div>
                </div>
                
                {/* Query latency percentiles */}
                <div className="mt-3 flex gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">P50</span>
                      <span>{health.database.queryLatency.p50.toFixed(1)}ms</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${Math.min(100, health.database.queryLatency.p50 / 2)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">P95</span>
                      <span>{health.database.queryLatency.p95.toFixed(1)}ms</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full"
                        style={{ width: `${Math.min(100, health.database.queryLatency.p95 / 5)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">P99</span>
                      <span>{health.database.queryLatency.p99.toFixed(1)}ms</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${Math.min(100, health.database.queryLatency.p99 / 10)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Runtime Details */}
              <div>
                <h4 className="text-sm font-medium mb-3">Agent Runtime</h4>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Active Agents</p>
                    <p className="font-medium">{health.agentRuntime.activeAgents}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Queued Tasks</p>
                    <p className="font-medium">{health.agentRuntime.queuedTasks}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Processing</p>
                    <p className="font-medium">{health.agentRuntime.processingTasks}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Wait Time</p>
                    <p className="font-medium">{health.agentRuntime.avgTaskWaitTime.toFixed(1)}s</p>
                  </div>
                </div>
              </div>

              {/* Resource Details */}
              <div>
                <h4 className="text-sm font-medium mb-3">Resources</h4>
                <div className="space-y-3">
                  {/* CPU */}
                  <div className="flex items-center gap-4">
                    <Cpu className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>CPU ({health.resources.cpu.cores} cores)</span>
                        <span>{health.resources.cpu.usage.toFixed(1)}%</span>
                      </div>
                      <Progress value={health.resources.cpu.usage} className="h-2" />
                    </div>
                  </div>

                  {/* Memory */}
                  <div className="flex items-center gap-4">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory</span>
                        <span>
                          {formatBytes(health.resources.memory.used)} / {formatBytes(health.resources.memory.total)}
                        </span>
                      </div>
                      <Progress value={health.resources.memory.usage} className="h-2" />
                    </div>
                  </div>

                  {/* Disk */}
                  <div className="flex items-center gap-4">
                    <HardDrive className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Disk</span>
                        <span>
                          {health.resources.disk.used.toFixed(1)} GB / {health.resources.disk.total} GB
                        </span>
                      </div>
                      <Progress value={health.resources.disk.usage} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

// ============================================================================
// SystemHealthCompact (Minimal variant)
// ============================================================================

interface SystemHealthCompactProps {
  health: SystemHealthMetrics;
  className?: string;
}

export function SystemHealthCompact({ health, className }: SystemHealthCompactProps) {
  const issues = [
    health.database.status !== 'healthy' && 'Database',
    health.realtime.status !== 'healthy' && 'Realtime',
    health.agentRuntime.status !== 'healthy' && 'Runtime',
    health.resources.cpu.usage > 80 && 'High CPU',
    health.resources.memory.usage > 80 && 'High Memory',
  ].filter(Boolean);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <HealthStatusBadge status={health.status} size="sm" />
      
      {issues.length > 0 ? (
        <span className="text-sm text-muted-foreground">
          {issues.length} issue{issues.length > 1 ? 's' : ''}: {issues.join(', ')}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">
          All systems operational
        </span>
      )}
    </div>
  );
}
