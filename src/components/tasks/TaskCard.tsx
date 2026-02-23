'use client';

/**
 * TaskCard Component (Enhanced)
 * 
 * Draggable task card for the Kanban board with collapsible details
 * and assignment dropdown.
 * 
 * Features:
 * - Full drag-and-drop support via @dnd-kit
 * - Collapsible task details
 * - Assignment dropdown with team members
 * - Enhanced priority indicators (urgent=red, high=orange, normal=blue, low=gray)
 * - Due date badges with overdue warnings
 * - Mobile touch support
 */

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  Zap,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import { cn, formatDate, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import type { TaskPriority, Agent } from '@/types';
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TaskCardProps } from './types';

// ============================================================================
// Extended Props
// ============================================================================

interface EnhancedTaskCardProps extends TaskCardProps {
  /** Available team members for assignment */
  teamMembers?: Agent[];
  /** Callback when assignee changes */
  onAssigneeChange?: (taskId: string, assigneeId: string | null) => void;
}

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
    borderColor: 'border-red-200',
    icon: <Zap className="w-3 h-3" />,
  },
  high: {
    label: 'High',
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200',
    icon: <ArrowUpCircle className="w-3 h-3" />,
  },
  normal: {
    label: 'Normal',
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200',
    icon: <Circle className="w-3 h-3" />,
  },
  low: {
    label: 'Low',
    color: '#6b7280',
    bgColor: 'bg-gray-500/10',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date();
}

function getDaysUntilDue(dueDate: string): number {
  const diff = new Date(dueDate).getTime() - new Date().getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getTimeInStage(createdAt: string, updatedAt: string): string {
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

function formatDueDateBadge(dueDate: string): { text: string; isOverdue: boolean; isSoon: boolean } {
  const overdue = isOverdue(dueDate);
  const daysUntil = getDaysUntilDue(dueDate);
  const isSoon = daysUntil <= 2 && daysUntil >= 0;
  
  let text: string;
  if (overdue) {
    text = `${Math.abs(daysUntil)}d overdue`;
  } else if (daysUntil === 0) {
    text = 'Today';
  } else if (daysUntil === 1) {
    text = 'Tomorrow';
  } else {
    text = formatDate(dueDate);
  }
  
  return { text, isOverdue: overdue, isSoon };
}

// ============================================================================
// Component
// ============================================================================

export function TaskCard({
  task,
  index,
  columnId,
  onClick,
  onEdit,
  onDelete,
  isOverlay = false,
  teamMembers = [],
  onAssigneeChange,
}: EnhancedTaskCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
      index,
      columnId,
    },
    disabled: isOverlay,
  });

  const priority = priorityConfig[task.priority];

  // Combine transform styles
  const style = React.useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
  }), [transform, transition]);

  const handleClick = React.useCallback(() => {
    if (!isDragging) {
      onClick?.(task);
    }
  }, [isDragging, onClick, task]);

  const handleEdit = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(task);
  }, [onEdit, task]);

  const handleDelete = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(task);
  }, [onDelete, task]);

  const handleExpandToggle = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(prev => !prev);
  }, []);

  const handleAssigneeChange = React.useCallback((value: string) => {
    const assigneeId = value === 'unassigned' ? null : value;
    onAssigneeChange?.(task.id, assigneeId);
  }, [onAssigneeChange, task.id]);

  // Handle keyboard activation
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(task);
    }
  }, [onClick, task]);

  // Due date badge info
  const dueDateInfo = task.due_date ? formatDueDateBadge(task.due_date) : null;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      tabIndex={0}
      role="button"
      aria-label={`${task.title}, ${priority.label} priority${task.assigned_agent ? `, assigned to ${task.assigned_agent.name}` : ', unassigned'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-testid={`task-card-${task.id}`}
      data-dragging={isDragging}
      className={cn(
        // Base styles
        'group relative bg-card border rounded-lg p-3',
        'cursor-grab active:cursor-grabbing',
        'hover:border-primary/50 hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',

        // Border styling with priority color
        'border-l-4',

        // Dragging state
        isDragging && 'opacity-50 scale-105 rotate-2 shadow-xl z-50',

        // Overlay state (when being dragged)
        isOverlay && 'opacity-90 scale-105 shadow-2xl cursor-grabbing rotate-2',

        // Updating state
        task.isUpdating && 'ring-2 ring-primary/30',

        // New task indicator
        task.isNew && 'ring-2 ring-green-400/50',

        // Touch device optimization
        'touch-manipulation',
      )}
      style={{
        ...style,
        borderLeftColor: priority.color,
      }}
    >
      {/* Live Update Indicator */}
      {task.isUpdating && (
        <div className="absolute -top-1 -right-1 z-10">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </span>
        </div>
      )}

      {/* New Task Indicator */}
      {task.isNew && (
        <div className="absolute -top-2 left-2 z-10">
          <Badge className="bg-green-500 text-white text-[10px] px-1.5 py-0">
            New
          </Badge>
        </div>
      )}

      {/* Drag Handle (visible on hover/focus) */}
      <div 
        className={cn(
          'absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity',
          'cursor-grab active:cursor-grabbing'
        )}
        aria-hidden="true"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Priority & Actions Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <Badge 
          variant="secondary" 
          className={cn(
            'text-[10px] font-medium border-0 gap-1',
            priority.bgColor, 
            priority.textColor
          )}
        >
          {priority.icon}
          {priority.label}
        </Badge>

        <div className="flex items-center gap-1">
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleExpandToggle}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>

          {/* Actions Menu */}
          {(onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Task actions"
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
          )}
        </div>
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
        <p className={cn(
          'text-xs text-muted-foreground mb-2',
          !isExpanded && 'line-clamp-2'
        )}>
          {task.description}
        </p>
      )}

      {/* Collapsible Details Section */}
      {isExpanded && (
        <div className="space-y-3 mb-3 pb-3 border-b border-border/50 animate-in slide-in-from-top-2 duration-200">
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="h-3 w-3 text-muted-foreground" />
              {task.tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Assignment Dropdown */}
          {onAssigneeChange && (
            <div className="flex items-center gap-2">
              <User className="h-3 w-3 text-muted-foreground" />
              <Select
                value={task.assigned_agent?.id || 'unassigned'}
                onValueChange={handleAssigneeChange}
              >
                <SelectTrigger 
                  className="h-7 text-xs w-full"
                  onPointerDown={(e: React.PointerEvent) => e.stopPropagation()}
                >
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || undefined} />
                          <AvatarFallback 
                            className={cn(
                              'text-[8px] text-white',
                              getAvatarColor(member.id)
                            )}
                          >
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Circle className="w-3 h-3" />
            <span className="capitalize">{task.status.replace('_', ' ')}</span>
          </div>
        </div>
      )}

      {/* Progress Bar (for in-progress tasks) */}
      {task.status === 'in_progress' && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{task.progress_percent || 0}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                (task.progress_percent || 0) < 30 ? 'bg-red-500' :
                (task.progress_percent || 0) < 70 ? 'bg-amber-500' : 'bg-green-500'
              )}
              style={{ width: `${task.progress_percent || 0}%` }}
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

        {/* Enhanced Due Date Badge */}
        {task.due_date && dueDateInfo && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  'flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium border',
                  dueDateInfo.isOverdue 
                    ? 'bg-red-100 text-red-700 border-red-200' 
                    : dueDateInfo.isSoon
                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                      : 'bg-gray-100 text-gray-600 border-gray-200'
                )}>
                  <Calendar className="w-3 h-3" />
                  <span>{dueDateInfo.text}</span>
                  {dueDateInfo.isOverdue && (
                    <AlertCircle className="w-3 h-3 ml-0.5" />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  Due {formatRelativeTime(task.due_date)}
                  {dueDateInfo.isOverdue && ' (Overdue)'}
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
          <span>{getTimeInStage(task.created_at, task.updated_at)}</span>
        </div>
        
        {/* Current Step (if available) */}
        {task.current_step && (
          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
            {task.current_step}
          </span>
        )}
      </div>
    </div>
  );
}

export default TaskCard;
