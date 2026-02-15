'use client';

/**
 * useRealtimeTaskPipeline Hook
 * 
 * Subscribe to real-time task status updates for the task pipeline/Kanban view.
 * 
 * @example
 * ```tsx
 * function TaskPipeline() {
 *   const { tasksByStatus, isConnected, moveTask } = useRealtimeTaskPipeline({
 *     tenantId: 'tenant-uuid',
 *   });
 * 
 *   return (
 *     <KanbanBoard columns={tasksByStatus} />
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtime } from '@/lib/realtime/useRealtime';
import type { Task, TaskStatus } from '@/types';

export type TaskStatusColumn = 
  | 'queued' 
  | 'in_progress' 
  | 'blocked' 
  | 'review' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface UseRealtimeTaskPipelineOptions {
  /** Tenant ID for filtering */
  tenantId?: string;
  /** Agent ID for filtering (optional) */
  agentId?: string;
  /** Initial tasks data (optional) */
  initialTasks?: Task[];
  /** Enable realtime updates (default: true) */
  enabled?: boolean;
  /** Called when a task is created */
  onTaskCreated?: (task: Task) => void;
  /** Called when a task is updated */
  onTaskUpdated?: (task: Task, oldTask: Task) => void;
  /** Called when a task status changes (most common use case) */
  onStatusChange?: (taskId: string, newStatus: TaskStatus, oldStatus: TaskStatus) => void;
}

export interface UseRealtimeTaskPipelineReturn {
  /** All tasks */
  tasks: Task[];
  /** Tasks grouped by status for Kanban columns */
  tasksByStatus: Record<TaskStatusColumn, Task[]>;
  /** Whether realtime is connected */
  isConnected: boolean;
  /** Connection state */
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
  /** Connection error if any */
  error: Error | null;
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Refresh task data from server */
  refetch: () => Promise<void>;
  /** Move task to a new status (optimistic) */
  moveTask: (taskId: string, newStatus: TaskStatus) => void;
  /** Get tasks by status */
  getTasksByStatus: (status: TaskStatus) => Task[];
  /** Get task count by status */
  getTaskCount: (status?: TaskStatus) => number;
}

const ALL_STATUSES: TaskStatusColumn[] = [
  'queued', 
  'in_progress', 
  'blocked', 
  'review', 
  'completed', 
  'failed', 
  'cancelled'
];

export function useRealtimeTaskPipeline(
  options: UseRealtimeTaskPipelineOptions
): UseRealtimeTaskPipelineReturn {
  const { 
    tenantId, 
    agentId,
    initialTasks = [], 
    enabled = true,
    onTaskCreated,
    onTaskUpdated,
    onStatusChange,
  } = options;
  
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isLoading, setIsLoading] = useState(initialTasks.length === 0);
  const supabase = createClient();
  const isMountedRef = useRef(true);

  // Fetch initial task data
  const fetchTasks = useCallback(async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });

      if (agentId) {
        query = query.eq('assignee_id', agentId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      if (isMountedRef.current) {
        setTasks(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [tenantId, agentId, supabase]);

  // Handle realtime inserts
  const handleInsert = useCallback((newRecord: object | null) => {
    if (!newRecord) return;
    
    const newTask = newRecord as unknown as Task;
    setTasks(prev => [newTask, ...prev]);
    onTaskCreated?.(newTask);
  }, [onTaskCreated]);

  // Handle realtime updates
  const handleUpdate = useCallback((
    newRecord: object | null,
    oldRecord: object | null
  ) => {
    if (!newRecord) return;

    const updatedTask = newRecord as unknown as Task;
    const oldTask = oldRecord as unknown as Task | null;

    setTasks(prevTasks => {
      const index = prevTasks.findIndex(t => t.id === updatedTask.id);
      
      if (index === -1) {
        // Task not found, add it
        return [updatedTask, ...prevTasks];
      }

      const newTasks = [...prevTasks];
      newTasks[index] = updatedTask;

      // Sort by updated_at to maintain order
      newTasks.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return newTasks;
    });

    onTaskUpdated?.(updatedTask, oldTask!);

    // Check for status change
    if (oldTask && updatedTask.status !== oldTask.status) {
      onStatusChange?.(updatedTask.id, updatedTask.status, oldTask.status);
    }
  }, [onTaskUpdated, onStatusChange]);

  // Build filter for realtime subscription
  const filter = useMemo(() => {
    const filters: string[] = [];
    if (tenantId) filters.push(`tenant_id=eq.${tenantId}`);
    if (agentId) filters.push(`assignee_id=eq.${agentId}`);
    return filters.length > 0 ? filters.join(',') : undefined;
  }, [tenantId, agentId]);

  // Use core realtime hook
  const {
    connectionState,
    error,
    isConnected,
  } = useRealtime({
    table: 'tasks',
    filter,
    events: ['INSERT', 'UPDATE'],
    enabled,
    tenantId,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
  });

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;
    
    if (initialTasks.length === 0 && tenantId) {
      fetchTasks();
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [initialTasks.length, tenantId, fetchTasks]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatusColumn, Task[]> = {
      queued: [],
      in_progress: [],
      blocked: [],
      review: [],
      completed: [],
      failed: [],
      cancelled: [],
    };

    for (const task of tasks) {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    }

    return grouped;
  }, [tasks]);

  // Optimistic move helper
  const moveTask = useCallback((taskId: string, newStatus: TaskStatus) => {
    setTasks(prevTasks => {
      const index = prevTasks.findIndex(t => t.id === taskId);
      if (index === -1) return prevTasks;

      const newTasks = [...prevTasks];
      newTasks[index] = {
        ...newTasks[index],
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      return newTasks;
    });
  }, []);

  // Get tasks by specific status
  const getTasksByStatus = useCallback((status: TaskStatus) => {
    return tasks.filter(t => t.status === status);
  }, [tasks]);

  // Get task count
  const getTaskCount = useCallback((status?: TaskStatus) => {
    if (status) {
      return tasks.filter(t => t.status === status).length;
    }
    return tasks.length;
  }, [tasks]);

  return {
    tasks,
    tasksByStatus,
    isConnected,
    connectionState,
    error,
    isLoading,
    refetch: fetchTasks,
    moveTask,
    getTasksByStatus,
    getTaskCount,
  };
}

export default useRealtimeTaskPipeline;
