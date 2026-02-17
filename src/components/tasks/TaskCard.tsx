'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, Clock, MoreHorizontal, User, AlertCircle, ArrowUpCircle, Circle, CheckCircle2, GripVertical, Zap } from 'lucide-react';
import { cn, formatDate, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { TaskPriority } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TaskCardProps } from './types';

interface PriorityConfig { label: string; color: string; bgColor: string; textColor: string; icon: React.ReactNode; }

const priorityConfig: Record<TaskPriority, PriorityConfig> = {
  urgent: { label: 'Urgent', color: '#ef4444', bgColor: 'bg-red-500/10', textColor: 'text-red-600 dark:text-red-400', icon: <Zap className="w-3 h-3" /> },
  high: { label: 'High', color: '#f97316', bgColor: 'bg-orange-500/10', textColor: 'text-orange-600 dark:text-orange-400', icon: <ArrowUpCircle className="w-3 h-3" /> },
  normal: { label: 'Normal', color: '#3b82f6', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400', icon: <Circle className="w-3 h-3" /> },
  low: { label: 'Low', color: '#6b7280', bgColor: 'bg-gray-500/10', textColor: 'text-gray-600 dark:text-gray-400', icon: <CheckCircle2 className="w-3 h-3" /> },
};

function isOverdue(dueDate: string): boolean { return new Date(dueDate) < new Date(); }

function getTimeInStage(createdAt: string, updatedAt: string): string {
  const referenceDate = new Date(updatedAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60));
  if (diffInHours < 1) return '< 1h';
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d`;
  return `${Math.floor(diffInDays / 30)}mo`;
}

export function TaskCard({ task, index, columnId, onClick, onEdit, onDelete, isOverlay = false }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id, data: { type: 'Task', task, index, columnId }, disabled: isOverlay,
  });

  const priority = priorityConfig[task.priority];
  const cardStyle = { transform: CSS.Transform.toString(transform), transition, borderLeftColor: priority.color };

  const handleClick = React.useCallback(() => { if (!isDragging) onClick?.(task); }, [isDragging, onClick, task]);
  const handleEdit = React.useCallback((e: React.MouseEvent) => { e.stopPropagation(); onEdit?.(task); }, [onEdit, task]);
  const handleDelete = React.useCallback((e: React.MouseEvent) => { e.stopPropagation(); onDelete?.(task); }, [onDelete, task]);
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(task); } }, [onClick, task]);

  return (
    <div ref={setNodeRef} style={cardStyle} {...attributes} {...listeners} tabIndex={0} role="button"
      aria-label={`${task.title}, ${priority.label} priority${task.assigned_agent ? `, assigned to ${task.assigned_agent.name}` : ', unassigned'}`}
      onClick={handleClick} onKeyDown={handleKeyDown} data-testid={`task-card-${task.id}`} data-dragging={isDragging}
      className={cn('group relative bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 border-l-4', isDragging && 'opacity-50 scale-105 rotate-2 shadow-xl z-50', isOverlay && 'opacity-90 scale-105 shadow-2xl cursor-grabbing rotate-2', task.isUpdating && 'ring-2 ring-primary/30', task.isNew && 'ring-2 ring-green-400/50', 'touch-manipulation')}>
      {task.isUpdating && (
        <div className="absolute -top-1 -right-1 z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      )}
      {task.isNew && (
        <div className="absolute -top-2 left-2 z-10">
          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">New</Badge>
        </div>
      )}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity cursor-grab active:cursor-grabbing" aria-hidden="true">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge variant="secondary" className={cn('text-[10px] font-medium border-0', priority.bgColor, priority.textColor)}>
          {priority.icon}<span className="ml-1">{priority.label}</span>
        </Badge>
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Task actions">
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && <DropdownMenuItem onClick={handleEdit}>Edit Task</DropdownMenuItem>}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <h4 className={cn("font-medium text-sm text-foreground mb-2 line-clamp-2", task.isUpdating && "text-primary")}>{task.title}</h4>
      {task.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{task.description}</p>}
      {task.status === 'in_progress' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress</span><span>{task.progress_percent || 0}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', (task.progress_percent || 0) < 30 ? 'bg-red-500' : (task.progress_percent || 0) < 70 ? 'bg-amber-500' : 'bg-green-500')} style={{ width: `${task.progress_percent || 0}%` }} />
          </div>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                {task.assigned_agent ? (
                  <Avatar className="h-6 w-6 ring-2 ring-background">
                    <AvatarImage src={task.assigned_agent.avatar_url || undefined} />
                    <AvatarFallback className={cn('text-[10px] text-white', getAvatarColor(task.assigned_agent.id))}>
                      {getInitials(task.assigned_agent.name)}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted border border-dashed border-muted-foreground/30 flex items-center justify-center">
                    <User className="w-3 h-3 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent><p className="text-xs">{task.assigned_agent?.name || 'Unassigned'}</p></TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {task.due_date && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn('flex items-center gap-1 text-[10px]', isOverdue(task.due_date) ? 'text-destructive' : 'text-muted-foreground')}>
                  <Calendar className="w-3 h-3" /><span>{formatDate(task.due_date)}</span>
                  {isOverdue(task.due_date) && <AlertCircle className="w-3 h-3 ml-0.5" />}
                </div>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Due {formatRelativeTime(task.due_date)}{isOverdue(task.due_date) && ' (Overdue)'}</p></TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" /><span>{getTimeInStage(task.created_at, task.updated_at)}</span>
        </div>
        {task.current_step && <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{task.current_step}</span>}
      </div>
    </div>
  );
}
