/**
 * Kanban Board Types
 * 
 * Type definitions for the drag-and-drop Kanban board components.
 */

import type { Task, TaskStatus, TaskPriority, Agent } from '@/types';

export interface KanbanTask extends Task {
  order?: number;
  isDragging?: boolean;
  isUpdating?: boolean;
  isNew?: boolean;
}

export interface KanbanColumn {
  id: TaskStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

export interface KanbanStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  completionRate: number;
  avgDuration: number;
}

export interface KanbanBoardProps {
  className?: string;
  tasks: KanbanTask[];
  onTaskMove: (taskId: string, newStatus: TaskStatus, newOrder?: number) => Promise<void>;
  onTaskReorder: (taskId: string, sourceStatus: TaskStatus, targetStatus: TaskStatus, newOrder: number) => Promise<void>;
  onTaskClick?: (task: KanbanTask) => void;
  onTaskEdit?: (task: KanbanTask) => void;
  onTaskDelete?: (task: KanbanTask) => void;
  readOnly?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

export interface KanbanColumnProps {
  column: KanbanColumn;
  tasks: KanbanTask[];
  onTaskClick?: (task: KanbanTask) => void;
  onTaskEdit?: (task: KanbanTask) => void;
  onTaskDelete?: (task: KanbanTask) => void;
  readOnly?: boolean;
}

export interface TaskCardProps {
  task: KanbanTask;
  index: number;
  columnId: TaskStatus;
  onClick?: (task: KanbanTask) => void;
  onEdit?: (task: KanbanTask) => void;
  onDelete?: (task: KanbanTask) => void;
  isOverlay?: boolean;
}

export interface DragItem {
  type: 'Task';
  id: string;
  status: TaskStatus;
  index: number;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  order?: number;
}

export interface UpdateTaskStatusResponse {
  data: Task;
  error?: string;
}

export interface DropAnimationConfig {
  duration: number;
  easing: string;
}

export interface DragOverlayConfig {
  dropAnimation: DropAnimationConfig;
}
