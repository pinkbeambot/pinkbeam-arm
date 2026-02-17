'use client';

import * as React from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task, TaskStatus } from '@/types';
import type { KanbanTask } from './types';

export interface UseKanbanBoardOptions {
  initialTasks?: Task[];
  tenantId?: string;
}

export interface UseKanbanBoardReturn {
  tasks: KanbanTask[];
  isLoading: boolean;
  error: Error | null;
  moveTask: (taskId: string, newStatus: TaskStatus, newOrder?: number) => Promise<void>;
  reorderTask: (taskId: string, sourceStatus: TaskStatus, targetStatus: TaskStatus, newOrder: number) => Promise<void>;
  refetch: () => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
}

function toKanbanTask(task: Task): KanbanTask {
  return { ...task, isDragging: false, isUpdating: false, isNew: false };
}

export function useKanbanBoard(options: UseKanbanBoardOptions = {}): UseKanbanBoardReturn {
  const { initialTasks } = options;
  const supabase = createClient();
  const [tasks, setTasks] = React.useState<KanbanTask[]>((initialTasks || []).map(toKanbanTask));
  const [isLoading, setIsLoading] = React.useState(!initialTasks);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchTasks = React.useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const { data, error: queryError } = await supabase.from('tasks').select(`*, assigned_agent:agents(*)`).order('updated_at', { ascending: false });
      if (queryError) throw queryError;
      setTasks((data || []).map(toKanbanTask));
    } catch (err) { setError(err instanceof Error ? err : new Error('Failed to fetch tasks')); }
    finally { setIsLoading(false); }
  }, [supabase]);

  React.useEffect(() => { if (!initialTasks) fetchTasks(); }, [fetchTasks, initialTasks]);

  const moveTask = React.useCallback(async (taskId: string, newStatus: TaskStatus, newOrder?: number): Promise<void> => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, ...(newOrder !== undefined && { order: newOrder }) }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to update task status'); }
  }, []);

  const reorderTask = React.useCallback(async (taskId: string, sourceStatus: TaskStatus, targetStatus: TaskStatus, newOrder: number): Promise<void> => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetStatus, order: newOrder }),
    });
    if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.error || 'Failed to reorder task'); }
  }, []);

  const updateTask = React.useCallback(async (taskId: string, updates: Partial<Task>): Promise<void> => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates, isUpdating: true } : t));
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      if (!response.ok) throw new Error('Failed to update task');
      const { data } = await response.json();
      setTasks(prev => prev.map(t => t.id === taskId ? { ...toKanbanTask(data), isUpdating: false } : t));
    } catch (err) { await fetchTasks(); throw err; }
  }, [fetchTasks]);

  const deleteTask = React.useCallback(async (taskId: string): Promise<void> => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete task');
    } catch (err) { await fetchTasks(); throw err; }
  }, [fetchTasks]);

  return { tasks, isLoading, error, moveTask, reorderTask, refetch: fetchTasks, updateTask, deleteTask };
}
