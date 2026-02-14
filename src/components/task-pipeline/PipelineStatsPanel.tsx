'use client';

/**
 * PipelineStatsPanel Component
 * 
 * Displays real-time pipeline statistics with animated counters.
 */

import * as React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Activity,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn, formatDuration } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { PipelineStatsPanelProps } from './types';

// ============================================================================
// Animated Counter Hook
// ============================================================================

function useAnimatedCounter(target: number, duration = 500): number {
  const [count, setCount] = React.useState(target);
  const previousRef = React.useRef(target);

  React.useEffect(() => {
    const start = previousRef.current;
    const diff = target - start;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = start + diff * easeOut;
      
      setCount(Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    previousRef.current = target;
  }, [target, duration]);

  return count;
}

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'default' | 'success' | 'warning' | 'danger';
  isRealtime?: boolean;
}

function StatCard({ 
  label, 
  value, 
  icon, 
  trend = 'neutral', 
  color = 'default',
  isRealtime 
}: StatCardProps) {
  const colorClasses = {
    default: 'bg-muted/50 border-border/50',
    success: 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400',
    warning: 'bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400',
    danger: 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl border transition-colors duration-200',
        colorClasses[color]
      )}
    >
      <div className="flex-shrink-0 p-2 rounded-lg bg-background/50">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold tabular-nums">{value}</p>
          {isRealtime && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function PipelineStatsPanel({ 
  stats, 
  className,
  isRealtime = false 
}: PipelineStatsPanelProps) {
  const animatedTotal = useAnimatedCounter(stats.total);
  const animatedCompletion = useAnimatedCounter(stats.completionRate);
  const animatedDuration = useAnimatedCounter(stats.avgDuration);

  const activeTasks = 
    (stats.byStatus.in_progress || 0) + 
    (stats.byStatus.review || 0);

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          Pipeline Stats
        </h3>
        <Badge 
          variant={isRealtime ? 'default' : 'secondary'} 
          className="text-[10px]"
        >
          {isRealtime ? (
            <>
              <Wifi className="w-3 h-3 mr-1" />
              Live
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </>
          )}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Tasks"
          value={animatedTotal}
          icon={<Activity className="w-4 h-4 text-muted-foreground" />}
          isRealtime={isRealtime}
        />

        <StatCard
          label="Active"
          value={activeTasks}
          icon={<Clock className="w-4 h-4 text-blue-500" />}
          color="default"
          isRealtime={isRealtime}
        />

        <StatCard
          label="Completion Rate"
          value={`${animatedCompletion}%`}
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          color={stats.completionRate >= 70 ? 'success' : stats.completionRate >= 40 ? 'warning' : 'danger'}
          isRealtime={isRealtime}
        />

        <StatCard
          label="Avg Duration"
          value={formatDuration(stats.avgDuration)}
          icon={<CheckCircle2 className="w-4 h-4 text-purple-500" />}
          isRealtime={isRealtime}
        />
      </div>

      {/* Status Breakdown */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
        {Object.entries(stats.byStatus)
          .filter(([, count]) => count > 0)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([status, count]) => (
            <Badge 
              key={status} 
              variant="secondary" 
              className="text-[10px] capitalize"
            >
              {status.replace('_', ' ')}: {count}
            </Badge>
          ))
        }
      </div>
    </div>
  );
}

// ============================================================================
// Compact Version for Small Spaces
// ============================================================================

export interface CompactPipelineStatsProps {
  stats: PipelineStatsPanelProps['stats'];
  isRealtime?: boolean;
  className?: string;
}

export function CompactPipelineStats({ 
  stats, 
  isRealtime,
  className 
}: CompactPipelineStatsProps) {
  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Total:</span>
        <span className="font-semibold tabular-nums">{stats.total}</span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Done:</span>
        <span className="font-semibold tabular-nums text-green-600">
          {stats.byStatus.completed || 0}
        </span>
      </div>
      
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">Rate:</span>
        <span className={cn(
          'font-semibold tabular-nums',
          stats.completionRate >= 70 ? 'text-green-600' : 
          stats.completionRate >= 40 ? 'text-amber-600' : 'text-red-600'
        )}>
          {stats.completionRate}%
        </span>
      </div>

      {isRealtime && (
        <span className="relative flex h-2 w-2 ml-auto">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      )}
    </div>
  );
}
