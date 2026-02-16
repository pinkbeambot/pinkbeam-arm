'use client';

/**
 * useTasks Hook
 * 
 * React Query-style hook for fetching and managing tasks data.
 * Connects to /api/tasks endpoint.
 * 
 * Features:
 * - Fetch tasks with filtering and pagination
 * - Loading skeletons and error states with retry
 * - Real-time updates via Supabase
 * - Empty states support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTenant } from '@/lib/hooks';
import { apiFetch } from './fetch';
import type { Task, TaskStatus, TaskPriority } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface TasksApiResponse {
  data: Task[];
  count: number;
  limit: number;
  offset: number;
}

export interface UseTasksOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  agent_id?: string;
  limit?: number;
  offset?: number;
  enabled?: boolean;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  agent_id?: string;
  due_date?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  agent_id?: string;
  due_date?: string;
}

export interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  count: number;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  retry: () => void;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  isMutating: boolean;
}

// ============================================================================
// Helper: Fetch Tasks
// ============================================================================

async function fetchTasks(options: UseTasksOptions = {}): Promise<TasksApiResponse> {
  const params = new URLSearchParams();
  
  if (options.status) params.set('status', options.status);
  if (options.priority) params.set('priority', options.priority);
  if (options.agent_id) params.set('agent_id', options.agent_id);
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.offset !== undefined) params.set('offset', options.offset.toString());

  const response = await apiFetch(`/api/tasks?${params.toString()}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch tasks: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// useTasks Hook
// ============================================================================

export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const supabase = createClient();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [count, setCount] = useState(0);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const limit = options.limit || 20;

  // Fetch tasks
  const fetchData = useCallback(async (offset = 0, append = false) => {
    if (!tenantId || !user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      if (append) {
        setIsFetching(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const result = await fetchTasks({
        ...options,
        limit,
        offset,
      });

      if (append) {
        setTasks((prev) => [...prev, ...result.data]);
      } else {
        setTasks(result.data);
      }
      setCount(result.count);
      setCurrentOffset(offset);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tasks'));
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  }, [tenantId, user?.id, options.status, options.priority, options.agent_id, limit]);

  // Initial fetch
  useEffect(() => {
    if (options.enabled !== false) {
      fetchData(0, false);
    }
  }, [fetchData, options.enabled, retryCount]);

  // Real-time subscription
  useEffect(() => {
    if (!tenantId || !user?.id || options.enabled === false) return;

    const channel = supabase
      .channel(`tasks:${tenantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            // Apply client-side filters
            if (options.status && newTask.status !== options.status) return;
            if (options.priority && newTask.priority !== options.priority) return;
            if (options.agent_id && newTask.assigned_agent_id !== options.agent_id) return;
            
            setTasks((prev) => [newTask, ...prev]);
            setCount((c) => c + 1);
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            setTasks((prev) =>
              prev.map((task) =>
                task.id === updatedTask.id ? { ...task, ...updatedTask } : task
              )
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedTask = payload.old as Task;
            setTasks((prev) => prev.filter((task) => task.id !== deletedTask.id));
            setCount((c) => Math.max(0, c - 1));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [tenantId, user?.id, supabase, options.enabled, options.status, options.priority, options.agent_id]);

  const refetch = useCallback(async () => {
    await fetchData(0, false);
  }, [fetchData]);

  const loadMore = useCallback(async () => {
    const nextOffset = currentOffset + limit;
    if (nextOffset < count) {
      await fetchData(nextOffset, true);
    }
  }, [currentOffset, limit, count, fetchData]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // Create task
  const createTask = useCallback(async (input: CreateTaskInput): Promise<Task> => {
    setIsMutating(true);
    try {
      const response = await apiFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create task: ${response.status}`);
      }

      const result = await response.json();
      const newTask = result.data as Task;
      
      // Optimistically add to list
      setTasks((prev) => [newTask, ...prev]);
      setCount((c) => c + 1);
      
      return newTask;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create task');
    } finally {
      setIsMutating(false);
    }
  }, []);

  // Update task
  const updateTask = useCallback(async (id: string, input: UpdateTaskInput): Promise<Task> => {
    setIsMutating(true);
    try {
      const response = await apiFetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update task: ${response.status}`);
      }

      const result = await response.json();
      const updatedTask = result.data as Task;
      
      // Optimistically update list
      setTasks((prev) =>
        prev.map((task) => (task.id === id ? { ...task, ...updatedTask } : task))
      );
      
      return updatedTask;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update task');
    } finally {
      setIsMutating(false);
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (id: string): Promise<void> => {
    setIsMutating(true);
    try {
      const response = await apiFetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete task: ${response.status}`);
      }

      // Optimistically remove from list
      setTasks((prev) => prev.filter((task) => task.id !== id));
      setCount((c) => Math.max(0, c - 1));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete task');
    } finally {
      setIsMutating(false);
    }
  }, []);

  const hasMore = currentOffset + tasks.length < count;

  return {
    tasks,
    isLoading,
    isFetching,
    error,
    count,
    hasMore,
    refetch,
    loadMore,
    retry,
    createTask,
    updateTask,
    deleteTask,
    isMutating,
  };
}

// ============================================================================
// useTask Hook (Single Task)
// ============================================================================

export interface UseTaskReturn {
  task: Task | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  retry: () => void;
}

export function useTask(taskId: string | null): UseTaskReturn {
  const { tenantId } = useTenant();
  const supabase = createClient();
  
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!taskId || !tenantId) {
      setTask(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiFetch(`/api/tasks/${taskId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch task: ${response.status}`);
      }

      const result = await response.json();
      setTask(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch task'));
    } finally {
      setIsLoading(false);
    }
  }, [taskId, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, retryCount]);

  // Real-time subscription for single task
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          const updatedTask = payload.new as Task;
          setTask((current) => (current ? { ...current, ...updatedTask } : updatedTask));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, supabase]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  const retry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  return {
    task,
    isLoading,
    error,
    refetch,
    retry,
  };
}

export default useTasks;
