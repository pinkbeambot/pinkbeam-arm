'use client';

/**
 * TaskPipelineColumn Component
 * 
 * Individual pipeline column representing a task status.
 * Supports drag-and-drop, real-time updates, and smooth animations.
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskPipelineCard } from './TaskPipelineCard';
import { useTaskPipelineColumn } from './useTaskPipeline';
import type { TaskPipelineColumnProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function TaskPipelineColumn({
  column,
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onStatusChange,
  onDragStart,
  draggingTaskId,
  readOnly = false,
  highlightNew = true,
}: TaskPipelineColumnProps) {
  const {
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragOver,
  } = useTaskPipelineColumn(column.id, tasks, onStatusChange);

  const handleDragStartWrapper = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    const task = tasks.find(t => t.id === taskId);
    if (task && onDragStart) {
      onDragStart(task);
    }
  };

  // Sort tasks: new tasks first, then by updated_at
  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      // New tasks first
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      
      // Then by updated_at (most recent first)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [tasks]);

  return (
    <motion.div
      layout
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] rounded-xl',
        'bg-muted/30 border-2 transition-all duration-300',
        isDragOver 
          ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
          : 'border-transparent hover:border-muted-foreground/10',
        'flex-shrink-0'
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          {/* Status Indicator */}
          <div className={cn(
            'w-3 h-3 rounded-full transition-transform duration-200',
            column.color,
            isDragOver && 'scale-125'
          )} />
          
          {/* Column Label */}
          <h3 className="font-semibold text-sm text-foreground">
            {column.label}
          </h3>
          
          {/* Task Count */}
          <Badge 
            variant="secondary" 
            className={cn(
              'text-xs font-medium tabular-nums transition-all duration-200',
              isDragOver && 'bg-primary/20 text-primary'
            )}
          >
            {tasks.length}
          </Badge>
        </div>

        {/* Add Button (optional) */}
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tasks Container */}
      <ScrollArea className="flex-1 px-2 py-2">
        <div className="space-y-2 min-h-[120px]">
          <AnimatePresence mode="popLayout">
            {sortedTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                layoutId={task.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{
                  layout: { duration: 0.3, ease: 'easeOut' },
                  opacity: { duration: 0.2 },
                  scale: { duration: 0.2 },
                }}
                draggable={!readOnly}
                onDragStart={(e) => handleDragStartWrapper(e as unknown as React.DragEvent, task.id)}
                className={cn(
                  !readOnly && 'cursor-grab active:cursor-grabbing'
                )}
              >
                <TaskPipelineCard
                  task={task}
                  onClick={onTaskClick}
                  onEdit={onTaskEdit}
                  onDelete={onTaskDelete}
                  isDragging={draggingTaskId === task.id}
                  isNew={highlightNew && task.isNew}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty State */}
          {tasks.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={cn(
                'flex flex-col items-center justify-center py-8',
                'text-muted-foreground border-2 border-dashed border-border/50 rounded-lg',
                isDragOver && 'border-primary/50 bg-primary/5'
              )}
            >
              <Circle className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-xs font-medium">No tasks</p>
              <p className="text-[10px] opacity-60 mt-0.5">
                {isDragOver ? 'Drop here' : 'Drag tasks here'}
              </p>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Drop Zone Indicator */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2 bg-primary/10 border-t border-primary/20"
          >
            <p className="text-xs text-center text-primary font-medium">
              Drop to move to {column.label}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
