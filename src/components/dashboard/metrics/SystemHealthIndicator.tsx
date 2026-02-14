/**
 * System Health Indicator Components
 * 
 * Visual indicators for system health status including:
 * - Overall health status badge
 * - Database health
 * - Realtime/WebSocket health
 * - Agent runtime health
 * - Resource utilization
 */

'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Activity,
  Database,
  Wifi,
  Bot,
  Cpu,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import type {
  SystemHealthIndicatorProps,
  HealthStatusBadgeProps,
  SystemHealthMetrics,
} from './types';

// ============================================================================
// Health Status Badge
// ============================================================================

type HealthStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

const statusConfig: Record<HealthStatus, {
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: typeof CheckCircle2;
  label: string;
}> = {
  healthy: {
    color: 'bg-green-500',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: CheckCircle2,
    label: 'Healthy',
  },
  degraded: {
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: AlertTriangle,
    label: 'Degraded',
  },
  critical: {
    color: 'bg-red-500',
    textColor: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
    label: 'Critical',
  },
  unknown: {
    color: 'bg-slate-400',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    icon: Clock,
    label: 'Unknown',
  },
};

export function HealthStatusBadge({
  status,
  label,
  showIcon = true,
  size = 'md',
}: HealthStatusBadgeProps) {
  const config = statusConfig[status as HealthStatus];
  const Icon = config.icon;
  const sizeKey = size || 'md';

  const sizeClasses: Record<string, string> = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes: Record<string, string> = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        config.borderColor,
        'border',
        sizeClasses[sizeKey]
      )}
    >
      {showIcon && <Icon className={cn(iconSizes[sizeKey], config.textColor)} />}
      <span className={cn('w-2 h-2 rounded-full', config.color)} />
      {label || config.label}
    </span>
  );
}

// ============================================================================
// Component Health Item
// ============================================================================

interface ComponentHealthItemProps {
  icon: React.ElementType;
  name: string;
  status: SystemHealthMetrics['status'];
  details?: string;
  metric?: string;
}

function ComponentHealthItem({
  icon: Icon,
  name,
  status,
  details,
  metric,
}: ComponentHealthItemProps) {
  const config = statusConfig[status as HealthStatus];

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', config.bgColor)}>
          <Icon className={cn('w-4 h-4', config.textColor)} />
        </div>
        <div>
          <p className="font-medium text-sm">{name}</p>
          {details && (
            <p className="text-xs text-muted-foreground">{details}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <HealthStatusBadge status={status} size="sm" showIcon={false} />
        {metric && (
          <p className="text-xs text-muted-foreground mt-1">{metric}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Resource Utilization Bar
// ============================================================================

interface ResourceBarProps {
  label: string;
  icon: React.ElementType;
  used: number;
  total: number;
  unit: string;
  percent: number;
}

function ResourceBar({
  label,
  icon: Icon,
  used,
  total,
  unit,
  percent,
}: ResourceBarProps) {
  const getColor = (p: number) => {
    if (p <= 60) return 'bg-green-500';
    if (p <= 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-muted-foreground">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className="font-medium">
          {used.toFixed(1)}{unit} / {total.toFixed(1)}{unit}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', getColor(percent))}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main System Health Indicator
// ============================================================================

export function SystemHealthIndicator({
  health,
  showDetails = true,
  className,
}: SystemHealthIndicatorProps) {
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-500" />
            System Health
          </CardTitle>
          <HealthStatusBadge status={health.status} />
        </div>
        <p className="text-xs text-muted-foreground">
          Uptime: {formatUptime(health.uptime)}
        </p>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-4">
          {/* Component Health */}
          <div className="space-y-1 divide-y">
            <ComponentHealthItem
              icon={Database}
              name="Database"
              status={health.database.status}
              details={`${health.database.responseTime.toFixed(0)}ms avg response`}
              metric={`${health.database.connectionPool.utilization.toFixed(0)}% pool used`}
            />
            <ComponentHealthItem
              icon={Wifi}
              name="Realtime"
              status={health.realtime.status}
              details={`${health.realtime.connections} connections`}
              metric={`${health.realtime.messagesPerSecond.toFixed(1)} msg/s`}
            />
            <ComponentHealthItem
              icon={Bot}
              name="Agent Runtime"
              status={health.agentRuntime.status}
              details={`${health.agentRuntime.activeAgents} active agents`}
              metric={`${health.agentRuntime.processingTasks} tasks processing`}
            />
          </div>

          {/* Resource Utilization */}
          <div className="space-y-3 pt-2 border-t">
            <p className="text-sm font-medium">Resources</p>
            <ResourceBar
              label="CPU"
              icon={Cpu}
              used={health.resources.cpu.usage}
              total={100}
              unit="%"
              percent={health.resources.cpu.usage}
            />
            <ResourceBar
              label="Memory"
              icon={Activity}
              used={health.resources.memory.used / 1024}
              total={health.resources.memory.total / 1024}
              unit="GB"
              percent={health.resources.memory.usage}
            />
            <ResourceBar
              label="Disk"
              icon={HardDrive}
              used={health.resources.disk.used}
              total={health.resources.disk.total}
              unit="GB"
              percent={health.resources.disk.usage}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================================================
// Compact System Health (for headers/sidebars)
// ============================================================================

export function SystemHealthCompact({
  health,
  className,
}: {
  health: SystemHealthMetrics;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <Database className="w-4 h-4 text-muted-foreground" />
        <HealthStatusBadge status={health.database.status} size="sm" showIcon={false} />
      </div>
      <div className="flex items-center gap-2">
        <Wifi className="w-4 h-4 text-muted-foreground" />
        <HealthStatusBadge status={health.realtime.status} size="sm" showIcon={false} />
      </div>
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-muted-foreground" />
        <HealthStatusBadge status={health.agentRuntime.status} size="sm" showIcon={false} />
      </div>
    </div>
  );
}
