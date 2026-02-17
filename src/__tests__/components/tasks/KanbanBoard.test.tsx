import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext } from '@dnd-kit/core';
import { KanbanBoard } from '@/components/tasks/KanbanBoard';
import { KanbanColumn } from '@/components/tasks/KanbanColumn';
import { TaskCard } from '@/components/tasks/TaskCard';
import type { KanbanTask, KanbanColumn as KanbanColumnType } from '@/components/tasks/types';

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
  { id: 'task-2', tenant_id: 'tenant-1', title: 'Second Task', description: 'Another description', status: 'queued', priority: 'normal', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
  { id: 'task-3', tenant_id: 'tenant-1', title: 'Third Task', status: 'completed', priority: 'low', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
];

describe('KanbanBoard', () => {
  const mockOnTaskMove = vi.fn().mockResolvedValue(undefined);
  const mockOnTaskReorder = vi.fn().mockResolvedValue(undefined);
  const mockOnRetry = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('renders all columns', () => {
    render(<KanbanBoard tasks={mockTasks} onTaskMove={mockOnTaskMove} onTaskReorder={mockOnTaskReorder} />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders tasks in correct columns', () => {
    render(<KanbanBoard tasks={mockTasks} onTaskMove={mockOnTaskMove} onTaskReorder={mockOnTaskReorder} />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('Second Task')).toBeInTheDocument();
    expect(screen.getByText('Third Task')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<KanbanBoard tasks={[]} onTaskMove={mockOnTaskMove} onTaskReorder={mockOnTaskReorder} isLoading={true} />);
    expect(screen.getByText('Loading board...')).toBeInTheDocument();
  });

  it('shows error state with retry', () => {
    const error = new Error('Failed to fetch');
    render(<KanbanBoard tasks={[]} onTaskMove={mockOnTaskMove} onTaskReorder={mockOnTaskReorder} error={error} onRetry={mockOnRetry} />);
    expect(screen.getByText('Failed to load tasks')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('shows empty state', () => {
    render(<KanbanBoard tasks={[]} onTaskMove={mockOnTaskMove} onTaskReorder={mockOnTaskReorder} isLoading={false} />);
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
  });

  it('calls onTaskClick when task is clicked', async () => {
    const mockOnTaskClick = vi.fn();
    const user = userEvent.setup();
    render(<KanbanBoard tasks={mockTasks} onTaskMove={mockOnTaskMove} onTaskReorder={mockOnTaskReorder} onTaskClick={mockOnTaskClick} />);
    await user.click(screen.getByText('Test Task'));
    expect(mockOnTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-1' }));
  });
});

describe('KanbanColumn', () => {
  it('renders column with correct label', () => {
    render(<DndContext><KanbanColumn column={mockColumn} tasks={[mockTask]} /></DndContext>);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders correct task count', () => {
    render(<DndContext><KanbanColumn column={mockColumn} tasks={[mockTask, { ...mockTask, id: 'task-2' }]} /></DndContext>);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<DndContext><KanbanColumn column={mockColumn} tasks={[]} /></DndContext>);
    expect(screen.getByText('No tasks')).toBeInTheDocument();
  });
});

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<DndContext><TaskCard task={mockTask} index={0} columnId="in_progress" /></DndContext>);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(<DndContext><TaskCard task={mockTask} index={0} columnId="in_progress" /></DndContext>);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const mockOnClick = vi.fn();
    const user = userEvent.setup();
    render(<DndContext><TaskCard task={mockTask} index={0} columnId="in_progress" onClick={mockOnClick} /></DndContext>);
    await user.click(screen.getByRole('button', { name: /test task/i }));
    expect(mockOnClick).toHaveBeenCalledWith(mockTask);
  });

  it('shows new task indicator', () => {
    render(<DndContext><TaskCard task={{ ...mockTask, isNew: true }} index={0} columnId="in_progress" /></DndContext>);
    expect(screen.getByText('New')).toBeInTheDocument();
  });
});
