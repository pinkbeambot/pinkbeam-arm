'use client';

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

const KANBAN_COLUMNS: KanbanColumnType[] = [
  { id: 'queued', label: 'Backlog', color: 'bg-slate-400', bgColor: 'bg-slate-50 dark:bg-slate-900/20', borderColor: 'border-slate-200 dark:border-slate-800' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20', borderColor: 'border-blue-200 dark:border-blue-800' },
  { id: 'review', label: 'Review', color: 'bg-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800' },
  { id: 'completed', label: 'Completed', color: 'bg-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20', borderColor: 'border-green-200 dark:border-green-800' },
];

function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load tasks</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">{error.message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />Try Again
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-12 px-4">
      <div className="p-4 rounded-full bg-muted mb-4">
        <LayoutGrid className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">No tasks yet</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-4">Your board is empty. Create a task to get started.</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      )}
    </motion.div>
  );
}

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
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [activeTask, setActiveTask] = React.useState<KanbanTask | null>(null);
  const [localTasks, setLocalTasks] = React.useState<KanbanTask[]>(tasks);

  React.useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const tasksByColumn = React.useMemo(() => {
    return KANBAN_COLUMNS.reduce((acc, column) => {
      acc[column.id] = localTasks.filter(t => t.status === column.id);
      return acc;
    }, {} as Record<TaskStatus, KanbanTask[]>);
  }, [localTasks]);

  const findTask = React.useCallback((id: string) => localTasks.find(t => t.id === id), [localTasks]);
  const findColumnByTaskId = React.useCallback((taskId: string) => findTask(taskId)?.status, [findTask]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const task = findTask(event.active.id as string);
    if (task) { setActiveId(event.active.id as string); setActiveTask(task); }
  }, [findTask]);

  const handleDragOver = React.useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeColumn = findColumnByTaskId(active.id as string);
    const overColumn = KANBAN_COLUMNS.find(c => c.id === over.id)?.id || findColumnByTaskId(over.id as string);
    if (!activeColumn || !overColumn || activeColumn === overColumn) return;
    setLocalTasks(prev => {
      const activeIndex = prev.findIndex(t => t.id === active.id);
      if (activeIndex === -1) return prev;
      const newTasks = [...prev];
      newTasks[activeIndex] = { ...newTasks[activeIndex], status: overColumn };
      return newTasks;
    });
  }, [findColumnByTaskId]);

  const handleDragEnd = React.useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); setActiveTask(null);
    if (!over) return;
    const sourceColumn = findColumnByTaskId(active.id as string);
    const targetColumn = KANBAN_COLUMNS.find(c => c.id === over.id)?.id || findColumnByTaskId(over.id as string);
    if (!sourceColumn || !targetColumn) return;
    const task = findTask(active.id as string);
    if (!task) return;
    const targetTasks = tasksByColumn[targetColumn];
    const overIndex = targetTasks.findIndex(t => t.id === over.id);
    const newOrder = overIndex >= 0 ? overIndex : targetTasks.length;

    if (sourceColumn !== targetColumn) {
      setLocalTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: targetColumn, order: newOrder } : t));
      try { await onTaskMove(active.id as string, targetColumn, newOrder); }
      catch (err) {
        setLocalTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: sourceColumn } : t));
        console.error('Failed to move task:', err);
      }
    } else {
      const sourceTasks = tasksByColumn[sourceColumn];
      const sourceIndex = sourceTasks.findIndex(t => t.id === active.id);
      const targetIndex = overIndex >= 0 ? overIndex : sourceTasks.length - 1;
      if (sourceIndex !== targetIndex) {
        setLocalTasks(prev => {
          const columnTaskIds = sourceTasks.map(t => t.id);
          const newOrderIds = arrayMove(columnTaskIds, sourceIndex, targetIndex);
          return prev.map(t => { const newIndex = newOrderIds.indexOf(t.id); return newIndex !== -1 ? { ...t, order: newIndex } : t; });
        });
        try { await onTaskReorder(active.id as string, sourceColumn, sourceColumn, targetIndex); }
        catch (err) { setLocalTasks(tasks); console.error('Failed to reorder task:', err); }
      }
    }
  }, [findColumnByTaskId, findTask, tasksByColumn, onTaskMove, onTaskReorder, tasks]);

  if (isLoading && localTasks.length === 0) return <Card className={cn('w-full', className)}><CardContent><LoadingState /></CardContent></Card>;
  if (error) return <Card className={cn('w-full', className)}><CardContent><ErrorState error={error} onRetry={onRetry} /></CardContent></Card>;
  if (!isLoading && localTasks.length === 0) return <Card className={cn('w-full', className)}><CardContent><EmptyState onRetry={onRetry} /></CardContent></Card>;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <Card className={cn('w-full overflow-hidden', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold">Task Board</CardTitle>
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-4 min-w-max">
              <AnimatePresence mode="popLayout">
                {KANBAN_COLUMNS.map((column) => (
                  <motion.div key={column.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
                    <KanbanColumn column={column} tasks={tasksByColumn[column.id] || []} onTaskClick={onTaskClick} onTaskEdit={onTaskEdit} onTaskDelete={onTaskDelete} readOnly={readOnly} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </CardContent>
      </Card>
      <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeTask ? <TaskCard task={{ ...activeTask, isDragging: true }} index={0} columnId={activeTask.status} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export type { KanbanBoardProps, KanbanColumnProps, TaskCardProps, KanbanTask } from './types';
