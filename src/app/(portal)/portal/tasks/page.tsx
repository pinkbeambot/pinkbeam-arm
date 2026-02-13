'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { 
  DashboardLayout, 
  PageContainer, 
  PageHeader 
} from '@/components/dashboard/layout/DashboardLayout';
import { 
  KanbanBoard, 
  TaskFilters, 
  TaskDetailModal, 
  CreateTaskModal 
} from '@/components/dashboard/tasks';
import { useTasks } from '@/lib/hooks/useTasks';
import { useAgents } from '@/lib/hooks/useAgents';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { Task, TaskStatus, TaskPriority } from '@/types';

export default function TasksPage() {
  const { toast } = useToast();
  
  // Fetch data using existing hooks
  const { 
    tasks, 
    isLoading: tasksLoading, 
    refetch,
    createTask,
    updateTask,
    deleteTask,
  } = useTasks({ limit: 100 });
  
  const { agents, isLoading: agentsLoading } = useAgents();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string | 'all'>('all');
  const [sortField, setSortField] = useState<'created_at' | 'updated_at' | 'due_date' | 'priority'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(task => 
        task.title.toLowerCase().includes(query) ||
        (task.description?.toLowerCase().includes(query) ?? false)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(task => task.status === statusFilter);
    }
    
    // Priority filter
    if (priorityFilter !== 'all') {
      result = result.filter(task => task.priority === priorityFilter);
    }
    
    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        result = result.filter(task => !task.assigned_agent_id);
      } else {
        result = result.filter(task => task.assigned_agent_id === assigneeFilter);
      }
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'due_date':
          const aDue = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bDue = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          comparison = aDue - bDue;
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
          comparison = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, assigneeFilter, sortField, sortOrder]);

  // Handlers
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  }, []);

  const handleTaskEdit = useCallback((task: Task) => {
    setSelectedTask(task);
    setDetailModalOpen(true);
  }, []);

  const handleTaskDelete = useCallback(async (task: Task) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTask(task.id);
      toast({
        title: 'Task Deleted',
        description: `"${task.title}" has been deleted.`,
      });
      if (selectedTask?.id === task.id) {
        setDetailModalOpen(false);
        setSelectedTask(null);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete task.',
        variant: 'destructive',
      });
    }
  }, [deleteTask, selectedTask, toast]);

  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updates: Parameters<typeof updateTask>[1] = { status: newStatus };
      
      // Set timestamps based on status change
      if (newStatus === 'in_progress' && !task.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (newStatus === 'completed') {
        updates.completed_at = new Date().toISOString();
        if (task.started_at) {
          const startTime = new Date(task.started_at).getTime();
          const endTime = new Date().getTime();
          updates.actual_duration = Math.floor((endTime - startTime) / (1000 * 60)); // minutes
        }
      }
      
      await updateTask(taskId, updates);
      toast({
        title: 'Status Updated',
        description: `Task moved to ${newStatus.replace('_', ' ')}.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update task status.',
        variant: 'destructive',
      });
    }
  }, [updateTask, tasks, toast]);

  const handleTaskUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      await updateTask(taskId, updates);
      toast({
        title: 'Task Updated',
        description: 'Changes saved successfully.',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update task.',
        variant: 'destructive',
      });
      throw err;
    }
  }, [updateTask, toast]);

  const handleCreateTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      await createTask({
        title: taskData.title || '',
        description: taskData.description,
        priority: taskData.priority || 'normal',
        assignee_id: taskData.assigned_agent_id,
        deadline_at: taskData.due_date,
      });
      toast({
        title: 'Task Created',
        description: `"${taskData.title}" has been created.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create task.',
        variant: 'destructive',
      });
      throw err;
    }
  }, [createTask, toast]);

  const loading = tasksLoading || agentsLoading;

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Task Pipeline"
          description="Track and manage work across your AI workforce"
        >
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </PageHeader>

        {/* Filters */}
        <div className="mb-6">
          <TaskFilters
            agents={agents}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            assigneeFilter={assigneeFilter}
            onAssigneeFilterChange={setAssigneeFilter}
            sortField={sortField}
            onSortFieldChange={setSortField}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
            totalCount={tasks.length}
            filteredCount={filteredTasks.length}
          />
        </div>

        {/* Kanban Board */}
        <div className="bg-card rounded-lg border p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <KanbanBoard
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onStatusChange={handleStatusChange}
            />
          )}
        </div>
      </PageContainer>

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTask(null);
        }}
        agents={agents}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        loading={tasksLoading}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        agents={agents}
        onCreate={handleCreateTask}
        loading={tasksLoading}
      />
    </DashboardLayout>
  );
}
