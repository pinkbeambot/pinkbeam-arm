'use client';

/**
 * KanbanBoard Component
 * 
 * Full-featured Kanban board with drag-and-drop functionality.
 * 
 * Features:
 * - Drag-and-drop between columns using @dnd-kit
 * - Reorder tasks within columns
 * - Touch support for mobile devices
 * - Optimistic UI updates with rollback on error
 * - Accessibility support (keyboard navigation)
 * - Visual feedback during drag operations
 * 
 * @example
 * ```tsx
 * <KanbanBoard
 *   tasks={tasks}
 *   onTaskMove={handleTaskMove}
 *   onTaskReorder={handleTaskReorder}
 *   onTaskClick={(task) => console.log(task)}
 * />
 * ```
 */

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type PointerActivationConstraint,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Loader2, RefreshCw, AlertCircle, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KanbanColumn } from './KanbanColumn';
import { TaskCard } from './TaskCard';
import type { KanbanBoardProps, KanbanColumn as KanbanColumnType, KanbanTask } from './types';
import type { TaskStatus } from '@/types';

// ============================================================================
// Column Configuration
// ============================================================================

const KANBAN_COLUMNS: KanbanColumnType[] = [
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
// Helper Components
// ============================================================================

function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
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
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      )}
    </motion.div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
      <p className="text-sm text-muted-foreground">Loading board...</p>
    </div>
  );
}

function EmptyState({ onRetry }: { onRetry?: () => void }) {
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
        Your board is empty. Create a task to get started.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      )}
    </motion.div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function KanbanBoard({
  className,
  tasks,
  onTaskMove,
  onTaskReorder,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  readOnly = false,
  isLoading = false,
  error = null,
  onRetry,
}: KanbanBoardProps) {
  // Track active drag state
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeTask, setActiveTask] = React.useState<KanbanTask | null>(null);
  
  // Local state for optimistic updates
  const [localTasks, setLocalTasks] = React.useState<KanbanTask[]>(tasks);
  const [pendingUpdates, setPendingUpdates] = React.useState<Set<string>>(new Set());

  // Sync local tasks with props
  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Configure sensors for drag detection
  const activationConstraint: PointerActivationConstraint = {
    delay: 150, // ms to wait before considering a drag
    tolerance: 5, // px of movement allowed before canceling drag
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint }),
    useSensor(TouchSensor, { activationConstraint }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by status
  const tasksByColumn = React.useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = localTasks.filter(t => t.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, KanbanTask[]>);
  }, [localTasks]);

  // Find task by ID
  const findTask = React.useCallback((id: string): KanbanTask | undefined => {
    return localTasks.find(t => t.id === id);
  }, [localTasks]);

  // Find column by task ID
  const findColumnByTaskId = React.useCallback((taskId: string): TaskStatus | undefined => {
    const task = findTask(taskId);
    return task?.status;
  }, [findTask]);

  // Handle drag start
  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = findTask(active.id as string);
    
    if (task) {
      setActiveId(active.id as string);
      setActiveTask(task);
    }
  }, [findTask]);

  // Handle drag over (for visual feedback)
  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the column we're over
    const activeColumn = findColumnByTaskId(activeId);
    const overColumn = KANBAN_COLUMNS.find(c => c.id === overId)?.id || 
                       findColumnByTaskId(overId);

    if (!activeColumn || !overColumn || activeColumn === overColumn) {
      return;
    }

    // Optimistically update the UI
    setLocalTasks(prev => {
      const activeIndex = prev.findIndex(t => t.id === activeId);
      if (activeIndex === -1) return prev;

      const newTasks = [...prev];
      newTasks[activeIndex] = { ...newTasks[activeIndex], status: overColumn };
      return newTasks;
    });
  }, [findColumnByTaskId]);

  // Handle drag end
  const handleDragEnd = React.useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the source and target columns
    const sourceColumn = findColumnByTaskId(activeId);
    const targetColumn = KANBAN_COLUMNS.find(c => c.id === overId)?.id || 
                         findColumnByTaskId(overId);

    if (!sourceColumn || !targetColumn) return;

    // Get the task being moved
    const task = findTask(activeId);
    if (!task) return;

    // Calculate the new order
    const targetTasks = tasksByColumn[targetColumn];
    const overIndex = targetTasks.findIndex(t => t.id === overId);
    const newOrder = overIndex >= 0 ? overIndex : targetTasks.length;

    // If moving to a new column
    if (sourceColumn !== targetColumn) {
      // Mark as pending
      setPendingUpdates(prev => new Set(prev).add(activeId));
      
      // Optimistic update
      setLocalTasks(prev => 
        prev.map(t => 
          t.id === activeId 
            ? { ...t, status: targetColumn, order: newOrder }
            : t
        )
      );

      try {
        await onTaskMove(activeId, targetColumn, newOrder);
      } catch (err) {
        // Revert on error
        setLocalTasks(prev => 
          prev.map(t => 
            t.id === activeId 
              ? { ...t, status: sourceColumn }
              : t
          )
        );
        console.error('Failed to move task:', err);
      } finally {
        setPendingUpdates(prev => {
          const next = new Set(prev);
          next.delete(activeId);
          return next;
        });
      }
    } else {
      // Reordering within the same column
      const sourceTasks = tasksByColumn[sourceColumn];
      const sourceIndex = sourceTasks.findIndex(t => t.id === activeId);
      const targetIndex = overIndex >= 0 ? overIndex : sourceTasks.length - 1;

      if (sourceIndex !== targetIndex) {
        // Mark as pending
        setPendingUpdates(prev => new Set(prev).add(activeId));
        
        // Optimistic reorder
        setLocalTasks(prev => {
          const columnTaskIds = sourceTasks.map(t => t.id);
          const newOrderIds = arrayMove(columnTaskIds, sourceIndex, targetIndex);
          
          return prev.map(t => {
            const newIndex = newOrderIds.indexOf(t.id);
            if (newIndex !== -1) {
              return { ...t, order: newIndex };
            }
            return t;
          });
        });

        try {
          await onTaskReorder(activeId, sourceColumn, sourceColumn, targetIndex);
        } catch (err) {
          // Revert on error - refetch to get correct state
          setLocalTasks(tasks);
          console.error('Failed to reorder task:', err);
        } finally {
          setPendingUpdates(prev => {
            const next = new Set(prev);
            next.delete(activeId);
            return next;
          });
        }
      }
    }
  }, [findColumnByTaskId, findTask, tasksByColumn, onTaskMove, onTaskReorder, tasks]);

  // Handle drag cancel
  const handleDragCancel = React.useCallback(() => {
    setActiveId(null);
    setActiveTask(null);
  }, []);

  // Render loading state
  if (isLoading && localTasks.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent>
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  // Render error state
  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent>
          <ErrorState error={error} onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  // Render empty state
  if (!isLoading && localTasks.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent>
          <EmptyState onRetry={onRetry} />
        </CardContent>
      </Card>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <Card className={cn('w-full overflow-hidden', className)}>
        {/* Header */}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Task Board</CardTitle>
            {isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {/* Kanban Board */}
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-4 min-w-max">
              <AnimatePresence mode="popLayout">
                {KANBAN_COLUMNS.map((column) => (
                  <motion.div
                    key={column.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <KanbanColumn
                      column={column}
                      tasks={tasksByColumn[column.id] || []}
                      onTaskClick={onTaskClick}
                      onTaskEdit={onTaskEdit}
                      onTaskDelete={onTaskDelete}
                      readOnly={readOnly}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask ? (
          <TaskCard
            task={{ ...activeTask, isDragging: true }}
            index={0}
            columnId={activeTask.status}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ============================================================================
// Export
// ============================================================================

export { KanbanColumn } from './KanbanColumn';
export { TaskCard } from './TaskCard';
export type {
  KanbanBoardProps,
  KanbanColumnProps,
  TaskCardProps,
  KanbanTask,
  KanbanColumn as KanbanColumnType,
} from './types';
