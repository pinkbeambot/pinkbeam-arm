import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { REALTIME_LISTEN_TYPES } from '@supabase/supabase-js';
import type { Task, TaskStatus, TaskPriority, RealtimeChangePayload } from '@/types';

interface UseTasksOptions {
  status?: TaskStatus;
  assignee_id?: string;
  priority?: TaskPriority;
  page?: number;
  limit?: number;
  enabled?: boolean;
}

interface TasksResponse {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UseTasksReturn {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  pagination: TasksResponse['pagination'] | null;
  refetch: () => Promise<void>;
  createTask: (task: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  addDependency: (taskId: string, dependsOnTaskId: string, type?: string) => Promise<void>;
  removeDependency: (taskId: string, dependencyId: string) => Promise<void>;
}

interface CreateTaskInput {
  title: string;
  description?: string;
  type?: string;
  assignee_id?: string;
  priority?: TaskPriority;
  parent_task_id?: string;
  inputs?: Record<string, unknown>;
  expected_outputs?: Record<string, unknown>;
  deadline_at?: string;
}

interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignee_id?: string;
  priority?: TaskPriority;
  progress_percent?: number;
  current_step?: string;
  outputs?: Record<string, unknown>;
  started_at?: string;
  completed_at?: string;
  actual_duration?: number;
  due_date?: string;
  acceptance_criteria?: string[];
}

/**
 * Hook for managing tasks with realtime updates
 */
export function useTasks(options: UseTasksOptions = {}): UseTasksReturn {
  const {
    status,
    assignee_id,
    priority,
    page = 1,
    limit = 20,
    enabled = true,
  } = options;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [pagination, setPagination] = useState<TasksResponse['pagination'] | null>(null);

  const supabase = createClient();

  // Fetch tasks
  const fetchTasks = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (assignee_id) params.set('assignee_id', assignee_id);
      if (priority) params.set('priority', priority);
      params.set('page', page.toString());
      params.set('limit', limit.toString());

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/tasks?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tasks');
      }

      const result: TasksResponse = await response.json();
      setTasks(result.data);
      setPagination(result.pagination);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [status, assignee_id, priority, page, limit, enabled, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Realtime subscription
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to task changes
    const channel = supabase
      .channel('tasks_changes')
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload: unknown) => {
          const typedPayload = payload as RealtimeChangePayload<Task>;
          setTasks((currentTasks) => {
            if (typedPayload.eventType === 'INSERT') {
              // Add new task if it matches filters
              const newTask = typedPayload.new;
              if (
                newTask &&
                (!status || newTask.status === status) &&
                (!assignee_id || newTask.assigned_agent_id === assignee_id) &&
                (!priority || newTask.priority === priority)
              ) {
                return [newTask, ...currentTasks];
              }
              return currentTasks;
            }

            if (typedPayload.eventType === 'UPDATE') {
              // Update existing task
              return currentTasks.map((task) =>
                task.id === typedPayload.new?.id ? { ...task, ...typedPayload.new } : task
              );
            }

            if (typedPayload.eventType === 'DELETE') {
              // Remove deleted task
              return currentTasks.filter((task) => task.id !== typedPayload.old?.id);
            }

            return currentTasks;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, status, assignee_id, priority, enabled]);

  // Create task
  const createTask = async (task: CreateTaskInput): Promise<Task> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(task),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create task');
    }

    const result = await response.json();
    return result.data;
  };

  // Update task
  const updateTask = async (id: string, updates: UpdateTaskInput): Promise<Task> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update task');
    }

    const result = await response.json();
    return result.data;
  };

  // Delete task
  const deleteTask = async (id: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete task');
    }

    // Remove from local state
    setTasks((current) => current.filter((t) => t.id !== id));
  };

  // Add dependency
  const addDependency = async (
    taskId: string,
    dependsOnTaskId: string,
    type: string = 'blocks'
  ): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        depends_on_task_id: dependsOnTaskId,
        dependency_type: type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add dependency');
    }
  };

  // Remove dependency
  const removeDependency = async (taskId: string, dependencyId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `/api/tasks/${taskId}/dependencies?dependency_id=${dependencyId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to remove dependency');
    }
  };

  return {
    tasks,
    isLoading,
    error,
    pagination,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    addDependency,
    removeDependency,
  };
}

/**
 * Hook for a single task with realtime updates
 */
export function useTask(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  // Fetch task
  const fetchTask = useCallback(async () => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch task');
      }

      const result = await response.json();
      setTask(result.data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [taskId, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  // Realtime subscription
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task_${taskId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${taskId}`,
        },
        (payload) => {
          const typedPayload = payload as unknown as RealtimeChangePayload<Task>;
          if (typedPayload.new) {
            setTask((current) => (current ? { ...current, ...typedPayload.new } : typedPayload.new));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, supabase]);

  return {
    task,
    isLoading,
    error,
    refetch: fetchTask,
  };
}

/**
 * Hook for task dependencies
 */
export function useTaskDependencies(taskId: string | null) {
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [dependents, setDependents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const supabase = createClient();

  const fetchDependencies = useCallback(async () => {
    if (!taskId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/tasks/${taskId}/dependencies`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dependencies');
      }

      const result = await response.json();
      setDependencies(result.data.dependencies);
      setDependents(result.data.dependents);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [taskId, supabase]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  return {
    dependencies,
    dependents,
    isLoading,
    error,
    refetch: fetchDependencies,
  };
}
