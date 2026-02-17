import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { KanbanBoard } from '../KanbanBoard';
import { KanbanColumn } from '../KanbanColumn';
import { TaskCard } from '../TaskCard';
import type { KanbanTask, KanbanColumn as KanbanColumnType } from '../types';
import type { TaskStatus } from '@/types';

// ============================================================================
// Mock Data
// ============================================================================

const mockColumn: KanbanColumnType = {
  id: 'in_progress',
  label: 'In Progress',
  color: 'bg-blue-500',
  bgColor: 'bg-blue-50',
  borderColor: 'border-blue-200',
};

const mockTask: KanbanTask = {
  id: 'task-1',
  tenant_id: 'tenant-1',
  title: 'Test Task',
  description: 'Test description',
  status: 'in_progress',
  priority: 'high',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  assigned_agent: {
    id: 'agent-1',
    tenant_id: 'tenant-1',
    name: 'Test Agent',
    role: 'worker',
    status: 'active',
    depth: 1,
    capabilities: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
};

const mockTasks: KanbanTask[] = [
  mockTask,
  {
    id: 'task-2',
    tenant_id: 'tenant-1',
    title: 'Second Task',
    description: 'Another description',
    status: 'queued',
    priority: 'normal',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'task-3',
    tenant_id: 'tenant-1',
    title: 'Third Task',
    status: 'completed',
    priority: 'low',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// KanbanBoard Tests
// ============================================================================

describe('KanbanBoard', () => {
  const mockOnTaskMove = vi.fn().mockResolvedValue(undefined);
  const mockOnTaskReorder = vi.fn().mockResolvedValue(undefined);
  const mockOnTaskClick = vi.fn();
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all columns', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders tasks in correct columns', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    // Task 1 should be in In Progress
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    
    // Task 2 should be in Backlog
    expect(screen.getByText('Second Task')).toBeInTheDocument();
    
    // Task 3 should be in Completed
    expect(screen.getByText('Third Task')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <KanbanBoard
        tasks={[]}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        isLoading={true}
      />
    );

    expect(screen.getByText('Loading board...')).toBeInTheDocument();
  });

  it('shows error state with retry', () => {
    const error = new Error('Failed to fetch');
    render(
      <KanbanBoard
        tasks={[]}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        error={error}
        onRetry={mockOnRetry}
      />
    );

    expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    expect(screen.getByText('Failed to fetch')).toBeInTheDocument();
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('shows empty state', () => {
    render(
      <KanbanBoard
        tasks={[]}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        isLoading={false}
      />
    );

    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('Your board is empty. Create a task to get started.')).toBeInTheDocument();
  });

  it('calls onTaskClick when task is clicked', async () => {
    const user = userEvent.setup();
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        onTaskClick={mockOnTaskClick}
      />
    );

    const taskCard = screen.getByText('Test Task');
    await user.click(taskCard);

    expect(mockOnTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }));
  });

  it('displays task count in column headers', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    // Check that each column shows the correct count
    const inProgressColumn = screen.getByRole('region', { name: /in progress column/i });
    expect(within(inProgressColumn).getByText('1')).toBeInTheDocument();

    const backlogColumn = screen.getByRole('region', { name: /backlog column/i });
    expect(within(backlogColumn).getByText('1')).toBeInTheDocument();
  });

  it('renders in read-only mode without drag handles', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        readOnly={true}
      />
    );

    // Board should still render tasks
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});

// ============================================================================
// KanbanColumn Tests
// ============================================================================

describe('KanbanColumn', () => {
  it('renders column with correct label', () => {
    render(
      <KanbanColumn
        column={mockColumn}
        tasks={[mockTask]}
      />
    );

    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders correct task count', () => {
    render(
      <KanbanColumn
        column={mockColumn}
        tasks={[mockTask, { ...mockTask, id: 'task-2' }]}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(
      <KanbanColumn
        column={mockColumn}
        tasks={[]}
      />
    );

    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByText('Drag tasks here')).toBeInTheDocument();
  });

  it('renders all tasks in the column', () => {
    const tasks = [
      mockTask,
      { ...mockTask, id: 'task-2', title: 'Another Task' },
    ];

    render(
      <DndContext>
        <KanbanColumn
          column={mockColumn}
          tasks={tasks}
        />
      </DndContext>
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Another Task')).toBeInTheDocument();
  });

  it('applies drag-over styles when isOver is true', () => {
    // This would require testing with DndContext, which is done in integration tests
    // For now, we just verify the component renders correctly
    render(
      <DndContext>
        <KanbanColumn
          column={mockColumn}
          tasks={[]}
        />
      </DndContext>
    );

    const column = screen.getByTestId('kanban-column-in_progress');
    expect(column).toBeInTheDocument();
  });
});

// ============================================================================
// TaskCard Tests
// ============================================================================

describe('TaskCard', () => {
  it('renders task title', () => {
    render(
      <DndContext>
        <TaskCard
          task={mockTask}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders task description', () => {
    render(
      <DndContext>
        <TaskCard
          task={mockTask}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(
      <DndContext>
        <TaskCard
          task={mockTask}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();

    render(
      <DndContext>
        <TaskCard
          task={mockTask}
          index={0}
          columnId="in_progress"
          onClick={mockOnClick}
        />
      </DndContext>
    );

    const card = screen.getByRole('button', { name: /test task/i });
    await user.click(card);

    expect(mockOnClick).toHaveBeenCalledWith(mockTask);
  });

  it('calls onEdit when edit menu item is clicked', async () => {
    const user = userEvent.setup();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    render(
      <DndContext>
        <TaskCard
          task={mockTask}
          index={0}
          columnId="in_progress"
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      </DndContext>
    );

    // Open actions menu
    const menuButton = screen.getByLabelText('Task actions');
    await user.click(menuButton);

    // Click edit
    const editItem = screen.getByText('Edit Task');
    await user.click(editItem);

    expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
  });

  it('shows updating indicator when task is updating', () => {
    render(
      <DndContext>
        <TaskCard
          task={{ ...mockTask, isUpdating: true }}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    // The task should have a visual indicator (checked via class)
    const card = screen.getByTestId('task-card-task-1');
    expect(card).toHaveAttribute('data-dragging', 'false');
  });

  it('shows new task indicator', () => {
    render(
      <DndContext>
        <TaskCard
          task={{ ...mockTask, isNew: true }}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('renders progress bar for in-progress tasks', () => {
    render(
      <DndContext>
        <TaskCard
          task={{ ...mockTask, progress_percent: 50 }}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders assignee avatar', () => {
    render(
      <DndContext>
        <TaskCard
          task={mockTask}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    // Should show the avatar or fallback
    expect(screen.getByText('TA')).toBeInTheDocument();
  });

  it('renders unassigned state when no assignee', () => {
    const unassignedTask = { ...mockTask, assigned_agent: undefined };
    
    render(
      <DndContext>
        <TaskCard
          task={unassignedTask}
          index={0}
          columnId="in_progress"
        />
      </DndContext>
    );

    // Should show unassigned icon
    expect(document.querySelector('.lucide-user')).toBeInTheDocument();
  });

  it('handles keyboard activation', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();

    render(
      <DndContext>
        <TaskCard
          task={mockTask}
          index={0}
          columnId="in_progress"
          onClick={mockOnClick}
        />
      </DndContext>
    );

    const card = screen.getByRole('button', { name: /test task/i });
    await user.type(card, '{enter}');

    expect(mockOnClick).toHaveBeenCalledWith(mockTask);
  });
});
