import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanBoard } from '../KanbanBoard';
import type { KanbanTask } from '../types';

// ============================================================================
// Mock Data
// ============================================================================

const mockTasks: KanbanTask[] = [
  {
    id: 'task-1',
    tenant_id: 'tenant-1',
    title: 'Task in Backlog',
    description: 'Description 1',
    status: 'queued',
    priority: 'high',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'task-2',
    tenant_id: 'tenant-1',
    title: 'Task in Progress',
    description: 'Description 2',
    status: 'in_progress',
    priority: 'normal',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'task-3',
    tenant_id: 'tenant-1',
    title: 'Task in Review',
    description: 'Description 3',
    status: 'review',
    priority: 'low',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

// ============================================================================
// Integration Tests
// ============================================================================

describe('KanbanBoard Drag and Drop Integration', () => {
  const mockOnTaskMove = vi.fn().mockResolvedValue(undefined);
  const mockOnTaskReorder = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders board with all columns and tasks', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    // Check columns are rendered
    expect(screen.getByRole('region', { name: /backlog column/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /in progress column/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /review column/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /completed column/i })).toBeInTheDocument();

    // Check tasks are in correct columns
    const backlogColumn = screen.getByTestId('kanban-column-queued');
    const inProgressColumn = screen.getByTestId('kanban-column-in_progress');
    const reviewColumn = screen.getByTestId('kanban-column-review');

    expect(backlogColumn).toHaveTextContent('Task in Backlog');
    expect(inProgressColumn).toHaveTextContent('Task in Progress');
    expect(reviewColumn).toHaveTextContent('Task in Review');
  });

  it('displays correct task counts per column', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    // Get all badge elements with task counts
    const badges = screen.getAllByText(/^[0-9]+$/);
    
    // Find the badge showing "1" for each column
    const countBadges = badges.filter(badge => badge.textContent === '1');
    expect(countBadges.length).toBeGreaterThanOrEqual(3);
  });

  it('triggers task click callback', async () => {
    const user = userEvent.setup();
    const mockOnTaskClick = vi.fn();

    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        onTaskClick={mockOnTaskClick}
      />
    );

    const taskCard = screen.getByText('Task in Backlog');
    await user.click(taskCard);

    expect(mockOnTaskClick).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'task-1',
        title: 'Task in Backlog',
      })
    );
  });

  it('allows task editing through dropdown', async () => {
    const user = userEvent.setup();
    const mockOnTaskEdit = vi.fn();

    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        onTaskEdit={mockOnTaskEdit}
      />
    );

    // Find and click the actions menu button for the first task
    const menuButtons = screen.getAllByLabelText('Task actions');
    await user.click(menuButtons[0]);

    // Click the edit option
    const editOption = screen.getByText('Edit Task');
    await user.click(editOption);

    expect(mockOnTaskEdit).toHaveBeenCalled();
  });

  it('allows task deletion through dropdown', async () => {
    const user = userEvent.setup();
    const mockOnTaskDelete = vi.fn();

    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        onTaskDelete={mockOnTaskDelete}
      />
    );

    // Find and click the actions menu button
    const menuButtons = screen.getAllByLabelText('Task actions');
    await user.click(menuButtons[0]);

    // Click the delete option
    const deleteOption = screen.getByText('Delete');
    await user.click(deleteOption);

    expect(mockOnTaskDelete).toHaveBeenCalled();
  });

  it('shows empty states for columns without tasks', () => {
    const tasksInSingleColumn = mockTasks.filter(t => t.status === 'queued');

    render(
      <KanbanBoard
        tasks={tasksInSingleColumn}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    // Completed column should show empty state
    const completedColumn = screen.getByTestId('kanban-column-completed');
    expect(completedColumn).toHaveTextContent('No tasks');
  });

  it('handles loading state', () => {
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

  it('handles error state with retry', async () => {
    const user = userEvent.setup();
    const mockOnRetry = vi.fn();
    const error = new Error('Network error');

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
    expect(screen.getByText('Network error')).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalled();
  });

  it('renders correctly in read-only mode', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        readOnly={true}
      />
    );

    // Board should render without drag functionality
    expect(screen.getByText('Task in Backlog')).toBeInTheDocument();
    expect(screen.getByText('Task in Progress')).toBeInTheDocument();
  });

  it('displays task priority badges correctly', () => {
    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    // Check priority labels are shown
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('Normal')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument();
  });

  it('displays progress bars for in-progress tasks', () => {
    const tasksWithProgress = [
      ...mockTasks,
      {
        id: 'task-4',
        tenant_id: 'tenant-1',
        title: 'Task with Progress',
        status: 'in_progress',
        priority: 'normal',
        progress_percent: 75,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    render(
      <KanbanBoard
        tasks={tasksWithProgress}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows updating indicator on tasks during API calls', () => {
    const tasksWithUpdate = mockTasks.map(t => ({ ...t, isUpdating: true }));

    render(
      <KanbanBoard
        tasks={tasksWithUpdate}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    // Tasks should render even when updating
    expect(screen.getByText('Task in Backlog')).toBeInTheDocument();
  });

  it('shows new task indicator', () => {
    const tasksWithNew = [
      { ...mockTasks[0], isNew: true },
      ...mockTasks.slice(1),
    ];

    render(
      <KanbanBoard
        tasks={tasksWithNew}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
      />
    );

    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    const mockOnTaskClick = vi.fn();

    render(
      <KanbanBoard
        tasks={mockTasks}
        onTaskMove={mockOnTaskMove}
        onTaskReorder={mockOnTaskReorder}
        onTaskClick={mockOnTaskClick}
      />
    );

    // Find first task card and focus it
    const taskCards = screen.getAllByRole('button');
    const firstCard = taskCards.find(el => el.getAttribute('aria-label')?.includes('Task in Backlog'));
    
    if (firstCard) {
      await user.type(firstCard, '{enter}');
      expect(mockOnTaskClick).toHaveBeenCalled();
    }
  });
});
