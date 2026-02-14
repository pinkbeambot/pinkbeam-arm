'use client';

/**
 * useTaskPipeline Hook
 * 
 * Real-time task pipeline hook with WebSocket integration.
 * 
 * Features:
 * - Subscribe to task updates via WebSocket (#27 integration)
 * - Real-time task status updates
 * - Optimistic UI updates
 * - Automatic reconnection
 * - Stats calculation
 * 
 * @example
 * ```tsx
 * function MyPipeline() {
 *   const { 
 *     tasks, 
 *     isLoading, 
 *     isRealtime, 
 *     stats,
 *     updateTaskStatus 
 *   } = useTaskPipeline({
 *     realtime: true,
 *     topic: 'tenant:123:tasks',
 *     onTaskUpdate: (payload) => {
 *       console.log('Task updated:', payload);
 *     },
 *   });
 * 
 *   return <TaskPipeline tasks={tasks} stats={stats} />;
 * }
 * ```
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalWebSocket } from '@/hooks';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus } from '@/types';
import type { 
  UseTaskPipelineOptions, 
  UseTaskPipelineReturn, 
  PipelineTask, 
  PipelineStats,
  TaskUpdatePayload,
  TaskUpdateType 
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

// ============================================================================
// Helper: Calculate Pipeline Stats
// ============================================================================

function calculateStats(tasks: Task[]): PipelineStats {
  const byStatus = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const completed = byStatus.completed || 0;
  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const avgDuration = tasks
    .filter(t => t.actual_duration)
    .reduce((sum, t) => sum + (t.actual_duration || 0), 0) / 
    (tasks.filter(t => t.actual_duration).length || 1);

  return {
    total,
    byStatus,
    completionRate,
    avgDuration: Math.round(avgDuration),
  };
}

// ============================================================================
// Helper: Transform to Pipeline Task
// ============================================================================

function toPipelineTask(task: Task, isNew = false): PipelineTask {
  return {
    ...task,
    isNew,
    isUpdating: false,
    lastUpdateAt: new Date().toISOString(),
  };
}

// ============================================================================
// Hook: useTaskPipeline
// ============================================================================

export function useTaskPipeline(
  options: UseTaskPipelineOptions = {}
): UseTaskPipelineReturn {
  const {
    realtime = true,
    topic,
    filter,
    onTaskUpdate,
    onTaskCreate,
    onTaskDelete,
    onConnectionChange,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
  } = options;

  const supabase = createClient();
  const [tasks, setTasks] = useState<PipelineTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const newTaskIds = useRef<Set<string>>(new Set());
  
  // WebSocket integration using global hook from #27
  const { 
    isConnected, 
    subscribe,
    state: wsState 
  } = useGlobalWebSocket({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', 'wss://') + '/realtime/v1/websocket' || '',
    autoConnect: realtime,
  });

  const isRealtime = realtime && isConnected;

  // Notify connection state changes
  useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  // ============================================================================
  // Fetch Initial Tasks
  // ============================================================================

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assigned_agent:agents(*)
        `)
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filter?.assigneeId) {
        query = query.eq('assigned_agent_id', filter.assigneeId);
      }
      if (filter?.priority) {
        query = query.eq('priority', filter.priority);
      }
      if (filter?.dueBefore) {
        query = query.lte('due_date', filter.dueBefore);
      }
      if (filter?.dueAfter) {
        query = query.gte('due_date', filter.dueAfter);
      }
      if (filter?.search) {
        query = query.ilike('title', `%${filter.search}%`);
      }

      const { data, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      setTasks((data || []).map(t => toPipelineTask(t as Task)));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filter]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // ============================================================================
  // Real-time Subscription
  // ============================================================================

  useEffect(() => {
    if (!realtime || !topic) return;

    // Subscribe to WebSocket topic
    const unsubscribe = subscribe<TaskUpdatePayload>(topic, (message) => {
      const payload = message.payload;
      if (!payload) return;

      const { type, task, previousStatus } = payload;

      setTasks(prevTasks => {
        const existingIndex = prevTasks.findIndex(t => t.id === task.id);

        switch (type) {
          case 'task_created':
            if (existingIndex === -1) {
              // Mark as new for animation
              newTaskIds.current.add(task.id);
              setTimeout(() => newTaskIds.current.delete(task.id), 3000);
              
              onTaskCreate?.(task);
              return [toPipelineTask(task, true), ...prevTasks];
            }
            return prevTasks;

          case 'task_updated':
          case 'task_status_changed':
            onTaskUpdate?.(payload as TaskUpdatePayload);
            
            if (existingIndex >= 0) {
              const updated = [...prevTasks];
              updated[existingIndex] = {
                ...toPipelineTask(task),
                isUpdating: true,
              };
              
              // Clear updating state after animation
              setTimeout(() => {
                setTasks(current => 
                  current.map(t => 
                    t.id === task.id ? { ...t, isUpdating: false } : t
                  )
                );
              }, 500);
              
              return updated;
            }
            return [...prevTasks, toPipelineTask(task)];

          case 'task_deleted':
            onTaskDelete?.(task.id);
            return prevTasks.filter(t => t.id !== task.id);

          default:
            return prevTasks;
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [realtime, topic, subscribe, onTaskUpdate, onTaskCreate, onTaskDelete]);

  // ============================================================================
  // Fallback: Supabase Realtime (when WebSocket is not available)
  // ============================================================================

  useEffect(() => {
    if (!realtime || isConnected) return;

    // Fallback to Supabase Realtime
    const channel = supabase
      .channel('task-pipeline')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const task = newRecord as Task;

          setTasks(prevTasks => {
            switch (eventType) {
              case 'INSERT':
                newTaskIds.current.add(task.id);
                setTimeout(() => newTaskIds.current.delete(task.id), 3000);
                onTaskCreate?.(task);
                return [toPipelineTask(task, true), ...prevTasks];

              case 'UPDATE':
                onTaskUpdate?.({
                  type: 'task_updated',
                  task,
                  previousStatus: (oldRecord as Task)?.status,
                  timestamp: new Date().toISOString(),
                });
                return prevTasks.map(t => 
                  t.id === task.id ? toPipelineTask(task) : t
                );

              case 'DELETE':
                onTaskDelete?.((oldRecord as Task).id);
                return prevTasks.filter(t => t.id !== (oldRecord as Task).id);

              default:
                return prevTasks;
            }
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [realtime, isConnected, supabase, onTaskCreate, onTaskUpdate, onTaskDelete]);

  // ============================================================================
  // Polling Fallback (when realtime is disabled)
  // ============================================================================

  useEffect(() => {
    if (realtime) return;

    const interval = setInterval(() => {
      fetchTasks();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [realtime, refreshInterval, fetchTasks]);

  // ============================================================================
  // Actions
  // ============================================================================

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic update
    setTasks(prev => 
      prev.map(t => 
        t.id === taskId 
          ? { ...t, status: newStatus, isUpdating: true, lastUpdateAt: new Date().toISOString() }
          : t
      )
    );

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString(),
          ...(newStatus === 'in_progress' ? { started_at: new Date().toISOString() } : {}),
          ...(newStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // Clear updating state
      setTasks(prev => 
        prev.map(t => 
          t.id === taskId ? { ...t, isUpdating: false } : t
        )
      );
    } catch (err) {
      // Revert on error
      setTasks(prev => 
        prev.map(t => 
          t.id === taskId ? { ...t, isUpdating: false } : t
        )
      );
      throw err;
    }
  }, [supabase]);

  const updateTaskAssignee = useCallback(async (taskId: string, assigneeId: string | null) => {
    setTasks(prev => 
      prev.map(t => 
        t.id === taskId 
          ? { ...t, assigned_agent_id: assigneeId ?? undefined, isUpdating: true }
          : t
      )
    );

    try {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ 
          assigned_agent_id: assigneeId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId);

      if (updateError) throw updateError;

      setTasks(prev => 
        prev.map(t => 
          t.id === taskId ? { ...t, isUpdating: false } : t
        )
      );
    } catch (err) {
      setTasks(prev => 
        prev.map(t => 
          t.id === taskId ? { ...t, isUpdating: false } : t
        )
      );
      throw err;
    }
  }, [supabase]);

  // ============================================================================
  // Stats
  // ============================================================================

  const stats = useMemo(() => calculateStats(tasks), [tasks]);

  return {
    tasks,
    isLoading,
    isRealtime,
    isConnected,
    error,
    stats,
    refetch: fetchTasks,
    updateTaskStatus,
    updateTaskAssignee,
  };
}

// ============================================================================
// Hook: useTaskPipelineColumn
// ============================================================================

export interface UseTaskPipelineColumnReturn {
  tasks: PipelineTask[];
  isDragOver: boolean;
  handleDragEnter: () => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
}

export function useTaskPipelineColumn(
  status: TaskStatus,
  allTasks: PipelineTask[],
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void
): UseTaskPipelineColumnReturn {
  const [isDragOver, setIsDragOver] = useState(false);

  const tasks = useMemo(() => 
    allTasks.filter(t => t.status === status),
    [allTasks, status]
  );

  const handleDragEnter = useCallback(() => {
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId && onStatusChange) {
      onStatusChange(taskId, status);
    }
  }, [status, onStatusChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return {
    tasks,
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    handleDragOver,
  };
}
