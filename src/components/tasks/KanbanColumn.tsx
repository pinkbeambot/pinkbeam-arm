'use client';

/**
 * KanbanColumn Component
 * 
 * Droppable column for the Kanban board.
 * 
 * Features:
 * - Accepts dropped tasks from other columns
 * - Visual feedback during drag operations
 * - Sortable task list within the column
 * - Empty state when no tasks
 */

import * as React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Circle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TaskCard } from './TaskCard';
import type { KanbanColumnProps } from './types';

// ============================================================================
// Component
// ============================================================================

export function KanbanColumn({
  column,
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  readOnly = false,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
    disabled: readOnly,
  });

  // Sort tasks by order if available, otherwise by updated_at
  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      // If order is defined, sort by it
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      // Fallback to updated_at (most recent first)
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [tasks]);

  // Task IDs for sortable context
  const taskIds = React.useMemo(() => 
    sortedTasks.map(task => task.id),
    [sortedTasks]
  );

  return (
    <div
      ref={setNodeRef}
      role="region"
      aria-label={`${column.label} column`}
      data-testid={`kanban-column-${column.id}`}
      data-drag-over={isOver}
      className={cn(
        // Base styles
        'flex flex-col min-w-[280px] max-w-[320px] rounded-xl',
        'bg-muted/30 border-2 transition-all duration-200',
        'flex-shrink-0 h-full max-h-full',
        
        // Drag over state
        isOver 
          ? 'border-primary bg-primary/5 shadow-lg scale-[1.02]' 
          : 'border-transparent hover:border-muted-foreground/10',
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {/* Status Indicator */}
          <div className={cn(
            'w-3 h-3 rounded-full transition-transform duration-200',
            column.color,
            isOver && 'scale-125'
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
              isOver && 'bg-primary/20 text-primary'
            )}
          >
            {tasks.length}
          </Badge>
        </div>

        {/* Add Button (optional, shown on hover) */}
        {!readOnly && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label={`Add task to ${column.label}`}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Tasks Container */}
      <ScrollArea className="flex-1 px-2 py-2 min-h-0">
        <SortableContext 
          items={taskIds} 
          strategy={verticalListSortingStrategy}
          id={column.id}
        >
          <div 
            className="space-y-2 min-h-[120px]"
            data-testid={`column-tasks-${column.id}`}
          >
            {sortedTasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                columnId={column.id}
                onClick={onTaskClick}
                onEdit={onTaskEdit}
                onDelete={onTaskDelete}
              />
            ))}

            {/* Empty State */}
            {tasks.length === 0 && (
              <div
                className={cn(
                  'flex flex-col items-center justify-center py-8',
                  'text-muted-foreground border-2 border-dashed border-border/50 rounded-lg transition-all duration-200',
                  isOver && 'border-primary/50 bg-primary/5'
                )}
                data-testid={`empty-state-${column.id}`}
              >
                <Circle className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs font-medium">No tasks</p>
                <p className="text-[10px] opacity-60 mt-0.5">
                  {isOver ? 'Drop here' : 'Drag tasks here'}
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </ScrollArea>

      {/* Drop Zone Indicator */}
      {isOver && (
        <div className="px-4 py-2 bg-primary/10 border-t border-primary/20 flex-shrink-0 animate-in slide-in-from-bottom-2">
          <p className="text-xs text-center text-primary font-medium">
            Drop to move to {column.label}
          </p>
        </div>
      )}
    </div>
  );
}
