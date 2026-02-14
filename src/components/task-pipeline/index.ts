/**
 * Task Pipeline Components
 * 
 * Real-time task pipeline with WebSocket integration.
 * 
 * @example
 * ```tsx
 * import { TaskPipeline } from '@/components/task-pipeline';
 * 
 * function Dashboard() {
 *   return (
 *     <TaskPipeline
 *       options={{
 *         realtime: true,
 *         topic: 'tenant:123:tasks',
 *       }}
 *       onTaskClick={(task) => console.log(task)}
 *       showStats
 *     />
 *   );
 * }
 * ```
 */

// Main Component
export { TaskPipeline } from './TaskPipeline';

// Sub-components
export { TaskPipelineColumn } from './TaskPipelineColumn';
export { TaskPipelineCard } from './TaskPipelineCard';
export { TaskStatusBadge, TaskStatusIcon, getTaskStatusConfig } from './TaskStatusBadge';
export { 
  PipelineStatsPanel, 
  CompactPipelineStats 
} from './PipelineStatsPanel';

// Hooks
export { 
  useTaskPipeline, 
  useTaskPipelineColumn 
} from './useTaskPipeline';

// Types
export type {
  TaskPipelineProps,
  TaskPipelineColumnProps,
  TaskPipelineCardProps,
  TaskStatusBadgeProps,
  PipelineStatsPanelProps,
  UseTaskPipelineOptions,
  UseTaskPipelineReturn,
  PipelineTask,
  PipelineColumn,
  PipelineStats,
  TaskUpdatePayload,
  TaskUpdateType,
} from './types';
