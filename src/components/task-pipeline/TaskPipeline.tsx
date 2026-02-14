'use client';

/**
 * TaskPipeline Component
 * 
 * Real-time task pipeline with WebSocket integration.
 * 
 * Features:
 * - Live task status updates via WebSocket
 * - Drag-and-drop between columns
 * - Smooth animations for task movements
 * - Real-time statistics panel
 * - Responsive design
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <TaskPipeline />
 * 
 * // With options
 * <TaskPipeline
 *   options={{
 *     realtime: true,
 *     topic: 'tenant:123:tasks',
 *   }}
 *   onTaskClick={(task) => console.log(task)}
 *   showStats
 * />
 * ```
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  AlertCircle,
  LayoutGrid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TaskPipelineColumn } from './TaskPipelineColumn';
import { PipelineStatsPanel, CompactPipelineStats } from './PipelineStatsPanel';
import { useTaskPipeline } from './useTaskPipeline';
import type { TaskPipelineProps, PipelineColumn, PipelineTask } from './types';
import type { TaskStatus } from '@/types';

// ============================================================================
// Column Configuration
// ============================================================================

const PIPELINE_COLUMNS: PipelineColumn[] = [
  { 
    id: 'queued', 
    label: 'Backlog', 
    color: 'bg-slate-400',
    bgColor: 'bg-slate-50 dark:bg-slate-900/20',
    borderColor: 'border-slate-200 dark:border-slate-800',
  },
  { 
    id: 'in_progress', 
    label: 'In Progress', 
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  { 
    id: 'review', 
    label: 'Review', 
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
  { 
    id: 'completed', 
    label: 'Completed', 
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
  },
];

// ============================================================================
// Connection Status Badge
// ============================================================================

function ConnectionStatusBadge({ 
  isConnected, 
  isRealtime 
}: { 
  isConnected: boolean; 
  isRealtime: boolean;
}) {
  if (!isRealtime) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted text-muted-foreground text-xs">
              <WifiOff className="w-3 h-3" />
              <span>Offline</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Real-time updates disabled</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
              isConnected 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Live</span>
                <span className="relative flex h-1.5 w-1.5 ml-0.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                </span>
              </>
            ) : (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Connecting...</span>
              </>
            )}
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {isConnected ? 'Receiving real-time updates' : 'Connecting to server...'}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Error State
// ============================================================================

function ErrorState({ 
  error, 
  onRetry 
}: { 
  error: Error; 
  onRetry: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Failed to load tasks
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
        {error.message}
      </p>
      <Button onClick={onRetry} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </motion.div>
  );
}

// ============================================================================
// Loading State
// ============================================================================

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Loading pipeline...</p>
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-12 px-4"
    >
      <div className="p-4 rounded-full bg-muted mb-4">
        <LayoutGrid className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        No tasks yet
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">
        Your pipeline is empty. Create a task to get started.
      </p>
      <Button onClick={onRefresh} variant="outline" size="sm">
        <RefreshCw className="w-4 h-4 mr-2" />
        Refresh
      </Button>
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TaskPipeline({
  className,
  initialTasks,
  options = {},
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  readOnly = false,
  showStats = true,
  maxHeight = 'calc(100vh - 200px)',
}: TaskPipelineProps) {
  const {
    tasks,
    isLoading,
    isRealtime,
    isConnected,
    error,
    stats,
    refetch,
    updateTaskStatus,
  } = useTaskPipeline(options);

  const [draggingTaskId, setDraggingTaskId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<'board'>('board');

  // Group tasks by status
  const tasksByColumn = React.useMemo(() => {
    return PIPELINE_COLUMNS.reduce((acc, column) => {
      acc[column.id] = tasks.filter(t => t.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, PipelineTask[]>);
  }, [tasks]);

  // Handle drag start
  const handleDragStart = React.useCallback((task: PipelineTask) => {
    setDraggingTaskId(task.id);
  }, []);

  // Handle status change via drag-and-drop
  const handleStatusChange = React.useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, newStatus);
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
    setDraggingTaskId(null);
  }, [updateTaskStatus]);

  // Use initial tasks if provided (for controlled mode)
  const displayTasks = initialTasks || tasks;

  // Render
  if (isLoading && tasks.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent>
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent>
          <ErrorState error={error} onRetry={refetch} />
        </CardContent>
      </Card>
    );
  }

  if (!isLoading && tasks.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent>
          <EmptyState onRefresh={refetch} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl font-bold">Task Pipeline</CardTitle>
            <ConnectionStatusBadge 
              isConnected={isConnected} 
              isRealtime={isRealtime} 
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Refresh Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="h-8 w-8"
                  >
                    <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Refresh tasks</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Stats Panel */}
        <AnimatePresence>
          {showStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <PipelineStatsPanel 
                stats={stats} 
                isRealtime={isRealtime && isConnected}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>

      {/* Pipeline Board */}
      <CardContent className="p-0">
        <div 
          className="overflow-x-auto overflow-y-hidden"
          style={{ maxHeight }}
        >
          <div className="flex gap-4 p-4 min-w-max">
            <AnimatePresence mode="popLayout">
              {PIPELINE_COLUMNS.map((column) => (
                <TaskPipelineColumn
                  key={column.id}
                  column={column}
                  tasks={tasksByColumn[column.id] || []}
                  onTaskClick={onTaskClick}
                  onTaskEdit={onTaskEdit}
                  onTaskDelete={onTaskDelete}
                  onStatusChange={handleStatusChange}
                  onDragStart={handleDragStart}
                  draggingTaskId={draggingTaskId}
                  readOnly={readOnly}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Export Individual Components
// ============================================================================

export { TaskPipelineColumn } from './TaskPipelineColumn';
export { TaskPipelineCard } from './TaskPipelineCard';
export { TaskStatusBadge } from './TaskStatusBadge';
export { PipelineStatsPanel, CompactPipelineStats } from './PipelineStatsPanel';
export { useTaskPipeline, useTaskPipelineColumn } from './useTaskPipeline';
export type {
  TaskPipelineProps,
  TaskPipelineColumnProps,
  TaskPipelineCardProps,
  TaskStatusBadgeProps,
  PipelineStatsPanelProps,
  UseTaskPipelineOptions,
  UseTaskPipelineReturn,
  PipelineTask,
  PipelineColumn,
  PipelineStats,
} from './types';
