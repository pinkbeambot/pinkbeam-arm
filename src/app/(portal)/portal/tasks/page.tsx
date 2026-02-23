'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, LayoutGrid, GitBranch, Upload, ClipboardList } from 'lucide-react';
import {
  DashboardLayout,
  PageContainer,
  PageHeader
} from '@/components/dashboard/layout';
import {
  KanbanBoard,
  TaskFilters,
  TaskDetailModal,
  CreateTaskModal,
  DependencyGraph,
} from '@/components/dashboard/tasks';
import { useTasks } from '@/lib/hooks/useTasks';
import { useAgents } from '@/lib/hooks/useAgents';
import { useRBAC } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CSVImportDialog, TASK_SAMPLE_CSV } from '@/components/shared/CSVImportDialog';
import { TASK_COLUMNS } from '@/lib/csv-parser';
import { ErrorBoundary, ErrorFallback } from '@/components/error';
import { DashboardStatsSkeleton, TaskCardSkeleton } from '@/components/loading';
import { EmptyState } from '@/components/empty';
import { cn } from '@/lib/utils';
import type { Task, TaskStatus, TaskPriority } from '@/types';

type ViewMode = 'kanban' | 'graph';

export default function TasksPage() {
  return (
    <ErrorBoundary
      fallback={
        <DashboardLayout>
          <PageContainer>
            <ErrorFallback
              title="Failed to load tasks"
              description="We couldn't load your task pipeline. Please try again."
            />
          </PageContainer>
        </DashboardLayout>
      }
    >
      <TasksPageContent />
    </ErrorBoundary>
  );
}

function TasksPageContent() {
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

  // RBAC permissions
  const { can } = useRBAC();
  const canCreateTasks = can('tasks:create');
  const canUpdateTasks = can('tasks:update');
  const canDeleteTasks = can('tasks:delete');

  const showPermissionDenied = useCallback(() => {
    toast({ title: 'Permission Denied', description: 'You do not have permission to perform this action.', variant: 'destructive' });
  }, [toast]);

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);

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

  const handleImportTasks = useCallback(async (rows: Record<string, string>[]) => {
    const tasksToCreate = rows.map(row => ({
      title: row.title,
      description: row.description || undefined,
      priority: (row.priority?.toLowerCase() || 'normal') as 'low' | 'normal' | 'high' | 'urgent',
      type: row.type || 'generic',
      assignee_id: row.assignee_id || undefined,
      deadline_at: row.deadline_at || undefined,
    }));

    const response = await fetch('/api/tasks/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks: tasksToCreate }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Import failed');
    }

    const result = await response.json();
    refetch();
    const succeeded = result.meta?.created_count ?? result.data?.length ?? 0;
    const requested = result.meta?.requested_count ?? rows.length;
    return { succeeded, failed: requested - succeeded };
  }, [refetch]);

  const isLoading = tasksLoading || agentsLoading;

  // Show full page skeleton during initial load
  if (isLoading && tasks.length === 0) {
    return (
      <DashboardLayout>
        <PageContainer>
          <DashboardStatsSkeleton />
          <div className="mt-6">
            <div className="bg-card rounded-lg border p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <TaskCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </PageContainer>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageContainer>
        <PageHeader
          title="Task Pipeline"
          description="Track and manage work across your AI workforce"
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* View Toggle */}
            <div className="flex items-center bg-muted rounded-lg p-0.5 self-start sm:self-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('kanban')}
                className={cn(
                  'h-8 px-2 sm:px-3 gap-1.5 rounded-md',
                  viewMode === 'kanban' && 'bg-background shadow-sm'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('graph')}
                className={cn(
                  'h-8 px-2 sm:px-3 gap-1.5 rounded-md',
                  viewMode === 'graph' && 'bg-background shadow-sm'
                )}
              >
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Graph</span>
              </Button>
            </div>

            {canCreateTasks && (
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setImportDialogOpen(true)} size="sm" className="sm:size-default">
                  <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Import CSV</span>
                  <span className="sm:hidden">Import</span>
                </Button>
                <Button onClick={() => setCreateModalOpen(true)} size="sm" className="sm:size-default">
                  <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Create Task</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </div>
            )}
          </div>
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

        {/* Main Content */}
        <div className="bg-card rounded-lg border p-4">
          {tasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No tasks yet"
              description="Create your first task to start tracking work. Tasks can be assigned to agents and tracked through your pipeline."
              action={
                canCreateTasks
                  ? {
                      label: 'Create Task',
                      onClick: () => setCreateModalOpen(true),
                    }
                  : undefined
              }
            />
          ) : filteredTasks.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No matching tasks"
              description="Try adjusting your filters to see more results."
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setPriorityFilter('all');
                  setAssigneeFilter('all');
                },
              }}
            />
          ) : viewMode === 'kanban' ? (
            <KanbanBoard
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
              onTaskEdit={canUpdateTasks ? handleTaskEdit : handleTaskClick}
              onTaskDelete={canDeleteTasks ? handleTaskDelete : showPermissionDenied}
              onStatusChange={canUpdateTasks ? handleStatusChange : showPermissionDenied}
            />
          ) : (
            <DependencyGraph
              tasks={filteredTasks}
              onTaskClick={handleTaskClick}
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
        onUpdate={canUpdateTasks ? handleTaskUpdate : async () => { showPermissionDenied(); }}
        onDelete={canDeleteTasks ? handleTaskDelete : showPermissionDenied}
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

      <CSVImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        type="tasks"
        columns={TASK_COLUMNS}
        onImport={handleImportTasks}
        sampleData={TASK_SAMPLE_CSV}
      />
    </DashboardLayout>
  );
}
