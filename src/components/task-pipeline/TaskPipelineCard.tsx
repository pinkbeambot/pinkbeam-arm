'use client';

/**
 * TaskPipelineCard Component
 * 
 * Individual task card for the pipeline with real-time update animations.
 * Features drag-and-drop support, live update indicators, and rich task info.
 */

import * as React from 'react';
import { 
  Calendar, 
  Clock, 
  MoreHorizontal,
  User,
  AlertCircle,
  ArrowUpCircle,
  Circle,
  CheckCircle2,
  GripVertical,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatDate, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { TaskPriority } from '@/types';
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
import { TaskStatusBadge } from './TaskStatusBadge';
import type { TaskPipelineCardProps } from './types';

// ============================================================================
// Priority Configuration
// ============================================================================

interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const priorityConfig: Record<TaskPriority, PriorityConfig> = {
  urgent: {
    label: 'Urgent',
    color: '#ef4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-500',
    icon: <Zap className="w-3 h-3" />,
  },
  high: {
    label: 'High',
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-500',
    icon: <ArrowUpCircle className="w-3 h-3" />,
  },
  normal: {
    label: 'Normal',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500',
    icon: <Circle className="w-3 h-3" />,
  },
  low: {
    label: 'Low',
    color: '#6b7280',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-500',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function getTimeInStage(createdAt: string, updatedAt: string, status: string): string {
  const referenceDate = new Date(updatedAt);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60));

  if (diffInHours < 1) return '< 1h';
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}d`;
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo`;
}

// ============================================================================
// Component
// ============================================================================

export function TaskPipelineCard({
  task,
  onClick,
  onEdit,
  onDelete,
  isDragging = false,
  isNew = false,
  showProgress = true,
  columnId,
  isKeyboardGrabbed = false,
  keyboardDragHandlers,
}: TaskPipelineCardProps) {
  const priority = priorityConfig[task.priority];
  const hasDragHandle = !isDragging;

  const handleClick = () => onClick?.(task);
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  };
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!keyboardDragHandlers || !columnId) return;

    if (isKeyboardGrabbed) {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          keyboardDragHandlers.onKeyboardMove('left');
          break;
        case 'ArrowRight':
          e.preventDefault();
          keyboardDragHandlers.onKeyboardMove('right');
          break;
        case ' ':
        case 'Enter':
          e.preventDefault();
          keyboardDragHandlers.onKeyboardDrop();
          break;
        case 'Escape':
          e.preventDefault();
          keyboardDragHandlers.onKeyboardCancel();
          break;
      }
    } else if (e.key === ' ' || e.key === 'Enter') {
      // Only grab on Space; Enter opens the task
      if (e.key === ' ') {
        e.preventDefault();
        keyboardDragHandlers.onKeyboardGrab(task.id, task.title, columnId);
      }
    }
  };

  return (
    <motion.div
      layout
      tabIndex={0}
      role="article"
      aria-roledescription="draggable task"
      aria-grabbed={isKeyboardGrabbed || undefined}
      aria-label={`${task.title}, ${priority.label} priority${task.assigned_agent ? `, assigned to ${task.assigned_agent.name}` : ', unassigned'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      initial={isNew ? { opacity: 0, y: -20, scale: 0.95 } : false}
      animate={{
        opacity: isDragging ? 0.5 : 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging
          ? '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
          : '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
      }}
      transition={{
        layout: { duration: 0.3, ease: 'easeOut' },
        opacity: { duration: 0.2 },
        scale: { duration: 0.2 },
      }}
      className={cn(
        'group relative bg-card border rounded-lg p-3 cursor-pointer',
        'hover:border-primary/50 hover:shadow-md transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'border-l-4',
        task.isUpdating && 'ring-2 ring-primary/30',
        isNew && 'ring-2 ring-green-400/50',
        isKeyboardGrabbed && 'ring-2 ring-primary shadow-lg scale-[1.02]',
      )}
      style={{ borderLeftColor: priority.color }}
    >
      {/* Live Update Indicator */}
      <AnimatePresence>
        {task.isUpdating && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute -top-1 -right-1 z-10"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Task Indicator */}
      <AnimatePresence>
        {isNew && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute -top-2 left-2 z-10"
          >
            <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
              New
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag Handle */}
      {hasDragHandle && (
        <div 
          className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Priority & Actions Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge 
          variant="secondary" 
          className={cn(
            'text-[10px] font-medium border-0',
            priority.bgColor, 
            priority.textColor
          )}
        >
          {priority.icon}
          <span className="ml-1">{priority.label}</span>
        </Badge>

        {/* Actions Menu */}
        {onEdit || onDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem onClick={handleEdit}>
                  Edit Task
                </DropdownMenuItem>
              )}
              {onEdit && onDelete && <DropdownMenuSeparator />}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Title */}
      <h4 className={cn(
        "font-medium text-sm text-foreground mb-2 line-clamp-2",
        task.isUpdating && "text-primary"
      )}>
        {task.title}
      </h4>

      {/* Description Preview (if available) */}
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {task.description}
        </p>
      )}

      {/* Progress Bar (for in-progress tasks) */}
      {showProgress && task.status === 'in_progress' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{task.progress_percent || 0}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${task.progress_percent || 0}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                (task.progress_percent || 0) < 30 ? 'bg-red-500' :
                (task.progress_percent || 0) < 70 ? 'bg-amber-500' : 'bg-green-500'
              )}
            />
          </div>
        </div>
      )}

      {/* Footer Row */}
      <div className="flex items-center justify-between gap-2">
        {/* Assignee */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                {task.assigned_agent ? (
                  <Avatar className="h-6 w-6 ring-2 ring-background">
                    <AvatarImage src={task.assigned_agent.avatar_url || undefined} />
                    <AvatarFallback 
                      className={cn(
                        'text-[10px] text-white',
                        getAvatarColor(task.assigned_agent.id)
                      )}
                    >
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
            <TooltipContent>
              <p className="text-xs">
                {task.assigned_agent?.name || 'Unassigned'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Due Date */}
        {task.due_date && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  'flex items-center gap-1 text-[10px]',
                  isOverdue(task.due_date) ? 'text-destructive' : 'text-muted-foreground'
                )}>
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(task.due_date)}</span>
                  {isOverdue(task.due_date) && (
                    <AlertCircle className="w-3 h-3 ml-0.5" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Due {formatRelativeTime(task.due_date)}
                  {isOverdue(task.due_date) && ' (Overdue)'}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Time in Stage */}
      <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{getTimeInStage(task.created_at, task.updated_at, task.status)}</span>
        </div>
        
        {/* Current Step (if available) */}
        {task.current_step && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {task.current_step}
          </span>
        )}
      </div>
    </motion.div>
  );
}
