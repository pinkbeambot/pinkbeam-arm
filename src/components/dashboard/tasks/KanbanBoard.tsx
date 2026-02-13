'use client';

import { useState, useCallback, useMemo } from 'react';
import { 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  AlertCircle,
  ArrowUpCircle,
  Circle,
  CheckCircle2,
  XCircle,
  GripVertical
} from 'lucide-react';
import { cn, formatDate, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority, Agent } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Column configuration
export const KANBAN_COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'queued', label: 'Backlog', color: 'bg-gray-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', label: 'Review', color: 'bg-amber-500' },
  { id: 'completed', label: 'Done', color: 'bg-green-500' },
];

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

export function TaskCard({ 
  task, 
  onClick, 
  onEdit, 
  onDelete,
  dragHandleProps,
  isDragging 
}: TaskCardProps) {
  const priorityConfig = getPriorityConfig(task.priority);
  
  const handleClick = () => onClick?.(task);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'group relative bg-card border rounded-lg p-3 cursor-pointer',
        'hover:border-primary/50 hover:shadow-md transition-all duration-200',
        'active:scale-[0.98]',
        isDragging && 'opacity-50 rotate-2 shadow-lg',
        'border-l-4',
        priorityConfig.borderColor
      )}
      style={{ borderLeftColor: priorityConfig.color }}
    >
      {/* Drag Handle */}
      {dragHandleProps && (
        <div 
          {...dragHandleProps}
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Priority Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge 
          variant="secondary" 
          className={cn('text-xs font-medium', priorityConfig.bgColor, priorityConfig.textColor)}
        >
          {priorityConfig.icon}
          <span className="ml-1">{priorityConfig.label}</span>
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>Edit Task</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <h4 className="font-medium text-sm text-foreground mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Assignee */}
          {task.assigned_agent ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assigned_agent.avatar_url || undefined} />
                    <AvatarFallback 
                      className={cn('text-[10px] text-white', getAvatarColor(task.assigned_agent.id))}
                    >
                      {getInitials(task.assigned_agent.name)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{task.assigned_agent.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <Circle className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Due Date */}
        {task.due_date && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue(task.due_date) ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.due_date)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Due {formatRelativeTime(task.due_date)}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Time in Stage Indicator */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{getTimeInStage(task)}</span>
        </div>
      </div>
    </div>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  color: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  onDragOver: (e: React.DragEvent, status: TaskStatus) => void;
  onDrop: (e: React.DragEvent, status: TaskStatus) => void;
  onDragStart: (e: React.DragEvent, task: Task) => void;
  draggingTaskId?: string | null;
}

export function KanbanColumn({
  status,
  label,
  color,
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onDragOver,
  onDrop,
  onDragStart,
  draggingTaskId,
}: KanbanColumnProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDragOver(e, status);
  }, [onDragOver, status]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onDrop(e, status);
  }, [onDrop, status]);

  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDropWrapper = (e: React.DragEvent) => {
    setIsDragOver(false);
    handleDrop(e);
  };

  return (
    <div 
      className={cn(
        'flex flex-col min-w-[280px] max-w-[320px] bg-muted/30 rounded-lg',
        'border-2 transition-colors duration-200',
        isDragOver ? 'border-primary bg-primary/5' : 'border-transparent'
      )}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDropWrapper}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className={cn('w-3 h-3 rounded-full', color)} />
          <h3 className="font-semibold text-sm">{label}</h3>
          <Badge variant="secondary" className="text-xs">
            {tasks.length}
          </Badge>
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 p-2 space-y-2 min-h-[200px] overflow-y-auto">
        {tasks.map((task) => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task)}
            className="cursor-grab active:cursor-grabbing"
          >
            <TaskCard
              task={task}
              onClick={onTaskClick}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              isDragging={draggingTaskId === task.id}
            />
          </div>
        ))}
        
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Circle className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onTaskEdit: (task: Task) => void;
  onTaskDelete: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
}

export function KanbanBoard({
  tasks,
  onTaskClick,
  onTaskEdit,
  onTaskDelete,
  onStatusChange,
}: KanbanBoardProps) {
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      queued: [],
      in_progress: [],
      blocked: [],
      review: [],
      completed: [],
      failed: [],
      cancelled: [],
    };
    
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    
    return grouped;
  }, [tasks]);

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggingTaskId(task.id);
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: TaskStatus) => {
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    if (taskId) {
      onStatusChange(taskId, newStatus);
    }
    setDraggingTaskId(null);
  }, [onStatusChange]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 px-1">
      {KANBAN_COLUMNS.map((column) => (
        <KanbanColumn
          key={column.id}
          status={column.id}
          label={column.label}
          color={column.color}
          tasks={tasksByColumn[column.id] || []}
          onTaskClick={onTaskClick}
          onTaskEdit={onTaskEdit}
          onTaskDelete={onTaskDelete}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
          draggingTaskId={draggingTaskId}
        />
      ))}
    </div>
  );
}

// Helper functions
function getPriorityConfig(priority: TaskPriority) {
  const configs = {
    urgent: {
      label: 'Urgent',
      color: '#ef4444',
      borderColor: 'border-red-500',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-600 dark:text-red-400',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    high: {
      label: 'High',
      color: '#f97316',
      borderColor: 'border-orange-500',
      bgColor: 'bg-orange-500/10',
      textColor: 'text-orange-600 dark:text-orange-400',
      icon: <ArrowUpCircle className="w-3 h-3" />,
    },
    normal: {
      label: 'Normal',
      color: '#3b82f6',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600 dark:text-blue-400',
      icon: <Circle className="w-3 h-3" />,
    },
    low: {
      label: 'Low',
      color: '#6b7280',
      borderColor: 'border-gray-500',
      bgColor: 'bg-gray-500/10',
      textColor: 'text-gray-600 dark:text-gray-400',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
  };
  
  return configs[priority] || configs.normal;
}

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function getTimeInStage(task: Task): string {
  const now = new Date();
  let referenceDate: Date;
  
  switch (task.status) {
    case 'queued':
      referenceDate = new Date(task.created_at);
      break;
    case 'in_progress':
      referenceDate = task.started_at ? new Date(task.started_at) : new Date(task.updated_at);
      break;
    case 'review':
    case 'completed':
      referenceDate = new Date(task.updated_at);
      break;
    default:
      referenceDate = new Date(task.updated_at);
  }
  
  const diffInHours = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return '< 1h';
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d`;
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo`;
}
