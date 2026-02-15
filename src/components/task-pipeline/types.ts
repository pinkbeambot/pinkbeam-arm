/**
 * Task Pipeline Types
 * 
 * Type definitions for the real-time task pipeline component.
 */

import type { Task, TaskStatus, TaskPriority, Agent } from '@/types';

// ============================================================================
// Pipeline Types
// ============================================================================

export interface PipelineTask extends Task {
  isNew?: boolean;
  isUpdating?: boolean;
  lastUpdateAt?: string;
}

export interface PipelineColumn {
  id: TaskStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

export interface PipelineStats {
  total: number;
  byStatus: Record<TaskStatus, number>;
  completionRate: number;
  avgDuration: number;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export type TaskUpdateType = 
  | 'task_created'
  | 'task_updated' 
  | 'task_deleted'
  | 'task_status_changed'
  | 'task_assigned'
  | 'task_progress_updated';

export interface TaskUpdatePayload {
  type: TaskUpdateType;
  task: Task;
  previousStatus?: TaskStatus;
  previousAssigneeId?: string;
  timestamp: string;
}

export interface TaskPipelineWebSocketMessage {
  type: string;
  topic?: string;
  payload?: TaskUpdatePayload | Record<string, unknown>;
  ref?: string;
  event?: string;
}

// ============================================================================
// Hook Options & Return Types
// ============================================================================

export interface UseTaskPipelineOptions {
  /** Enable real-time updates via WebSocket */
  realtime?: boolean;
  /** WebSocket topic to subscribe to (e.g., 'tenant:123:tasks') */
  topic?: string;
  /** Initial filter for tasks */
  filter?: TaskPipelineFilter;
  /** Callback when a task is updated */
  onTaskUpdate?: (payload: TaskUpdatePayload) => void;
  /** Callback when a task is created */
  onTaskCreate?: (task: Task) => void;
  /** Callback when a task is deleted */
  onTaskDelete?: (taskId: string) => void;
  /** Callback when connection state changes */
  onConnectionChange?: (isConnected: boolean) => void;
  /** Auto-refresh interval in ms (disabled if realtime is enabled) */
  refreshInterval?: number;
}

export interface UseTaskPipelineReturn {
  tasks: PipelineTask[];
  isLoading: boolean;
  isRealtime: boolean;
  isConnected: boolean;
  error: Error | null;
  stats: PipelineStats;
  refetch: () => Promise<void>;
  updateTaskStatus: (taskId: string, newStatus: TaskStatus) => Promise<void>;
  updateTaskAssignee: (taskId: string, assigneeId: string | null) => Promise<void>;
}

export interface TaskPipelineFilter {
  assigneeId?: string;
  priority?: TaskPriority;
  search?: string;
  dueBefore?: string;
  dueAfter?: string;
}

// ============================================================================
// Component Props
// ============================================================================

export interface TaskPipelineProps {
  className?: string;
  initialTasks?: Task[];
  options?: UseTaskPipelineOptions;
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (task: Task) => void;
  readOnly?: boolean;
  showStats?: boolean;
  maxHeight?: string;
}

export interface TaskPipelineColumnProps {
  column: PipelineColumn;
  tasks: PipelineTask[];
  onTaskClick?: (task: Task) => void;
  onTaskEdit?: (task: Task) => void;
  onTaskDelete?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onDragStart?: (task: PipelineTask) => void;
  onDragOver?: (status: TaskStatus) => void;
  onDrop?: (status: TaskStatus) => void;
  draggingTaskId?: string | null;
  isDragOver?: boolean;
  readOnly?: boolean;
  highlightNew?: boolean;
  /** Keyboard drag-and-drop state */
  keyboardDragState?: KeyboardDragState | null;
  /** Keyboard drag-and-drop handlers */
  keyboardDragHandlers?: KeyboardDragHandlers;
}

export interface TaskPipelineCardProps {
  task: PipelineTask;
  onClick?: (task: Task) => void;
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  isDragging?: boolean;
  isNew?: boolean;
  showProgress?: boolean;
  /** Column this card belongs to (for keyboard drag) */
  columnId?: TaskStatus;
  /** Whether this card is currently grabbed via keyboard */
  isKeyboardGrabbed?: boolean;
  /** Keyboard drag-and-drop handlers */
  keyboardDragHandlers?: KeyboardDragHandlers;
}

export interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  pulse?: boolean;
}

export interface PipelineStatsPanelProps {
  stats: PipelineStats;
  className?: string;
  isRealtime?: boolean;
}

// ============================================================================
// Keyboard Drag Types
// ============================================================================

export interface KeyboardDragState {
  taskId: string;
  taskTitle: string;
  sourceColumnId: TaskStatus;
  targetColumnId: TaskStatus;
}

export interface KeyboardDragHandlers {
  onKeyboardGrab: (taskId: string, taskTitle: string, sourceColumnId: TaskStatus) => void;
  onKeyboardMove: (direction: 'left' | 'right') => void;
  onKeyboardDrop: () => void;
  onKeyboardCancel: () => void;
}

// ============================================================================
// Animation Types
// ============================================================================

export interface TaskAnimationState {
  taskId: string;
  animation: 'enter' | 'exit' | 'update' | 'move';
  timestamp: number;
}
