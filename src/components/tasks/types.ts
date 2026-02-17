/**
 * Kanban Board Types
 * 
 * Type definitions for the drag-and-drop Kanban board components.
 */

import type { Task, TaskStatus, TaskPriority, Agent } from '@/types';

// ============================================================================
// Core Types
// ============================================================================

export interface KanbanTask extends Task {
  /** Display order within the column */
  order?: number;
  /** Whether the task is being dragged */
  isDragging?: boolean;
  /** Whether the task is being updated via API */
  isUpdating?: boolean;
  /** Whether this is a newly created task */
  isNew?: boolean;
}

export interface KanbanColumnType {
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

// ============================================================================
// Component Props
// ============================================================================

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
  column: KanbanColumnType;
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

// ============================================================================
// Drag and Drop Types
// ============================================================================

export interface DragItem {
  type: 'Task';
  id: string;
  status: TaskStatus;
  index: number;
}

export interface DragEndResult {
  active: { id: string };
  over: { id: string } | null;
}

// ============================================================================
// API Types
// ============================================================================

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
  order?: number;
}

export interface UpdateTaskStatusResponse {
  data: Task;
  error?: string;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface DropAnimationConfig {
  duration: number;
  easing: string;
}

export interface DragOverlayConfig {
  dropAnimation: DropAnimationConfig;
}
