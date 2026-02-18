/**
 * Activity Feed Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import * as React from 'react';

// Mock Next.js router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/portal/activity',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock useActivities hook
const mockUseActivities = vi.fn();
vi.mock('@/hooks/useActivities', () => ({
  useActivities: (...args: unknown[]) => mockUseActivities(...args),
  EntityType: {},
  TimeRange: {},
  ActionType: {},
}));

// Mock fetch
global.fetch = vi.fn();

// Mock useAuth
vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: { id: 'user-1', user_metadata: { tenant_id: 'tenant-1' } },
  }),
}));

// Mock empty state components
vi.mock('@/components/empty', () => ({
  EmptyStateSearch: ({ title, description, onClear }: { title: string; description: string; onClear?: () => void }) => (
    <div data-testid="empty-state-search">
      <h3>{title}</h3>
      <p>{description}</p>
      {onClear && <button data-testid="clear-search" onClick={onClear}>Clear</button>}
    </div>
  ),
  EmptyStateError: ({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) => (
    <div data-testid="empty-state-error">
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && <button data-testid="retry-button" onClick={onRetry}>Try Again</button>}
    </div>
  ),
}));

import { ActivityFeedPageClient } from '@/app/(portal)/portal/activity/ActivityFeedPageClient';

describe('ActivityFeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActivities.mockReturnValue({
      activities: [],
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      isRealtimeConnected: true,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    });
  });

  it('should render page with title and description', () => {
    render(<ActivityFeedPageClient />);

    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    expect(screen.getByText(/Real-time stream of everything happening/)).toBeInTheDocument();
  });

  it('should show live indicator when realtime is connected', () => {
    render(<ActivityFeedPageClient />);

    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should show offline indicator when realtime is disconnected', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      isRealtimeConnected: false,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show loading state initially', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      isLoading: true,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      isRealtimeConnected: true,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    // Should show skeleton loaders
    const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render activities when data is loaded', async () => {
    const mockActivities = [
      {
        id: 'activity-1',
        tenant_id: 'tenant-1',
        agent_id: 'agent-1',
        type: 'task.created',
        title: 'Test Activity 1',
        description: 'Test description',
        metadata: { actor_name: 'Test Agent' },
        created_at: new Date().toISOString(),
      },
      {
        id: 'activity-2',
        tenant_id: 'tenant-1',
        agent_id: 'agent-2',
        type: 'agent.spawned',
        title: 'Test Activity 2',
        description: 'Test description 2',
        metadata: { actor_name: 'Another Agent' },
        created_at: new Date().toISOString(),
      },
    ];

    mockUseActivities.mockReturnValue({
      activities: mockActivities,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      isRealtimeConnected: true,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    await waitFor(() => {
      expect(screen.getByText('Test Activity 1')).toBeInTheDocument();
    });
  });

  it('should show empty state when no activities', () => {
    render(<ActivityFeedPageClient />);

    expect(screen.getByText('No activities yet')).toBeInTheDocument();
  });

  it('should show error state when there is an error', () => {
    mockUseActivities.mockReturnValue({
      activities: [],
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: new Error('Failed to fetch'),
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      isRealtimeConnected: false,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    expect(screen.getByTestId('empty-state-error')).toBeInTheDocument();
    expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked', async () => {
    const mockRefetch = vi.fn();
    mockUseActivities.mockReturnValue({
      activities: [],
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: new Error('Failed to fetch'),
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: mockRefetch,
      isRealtimeConnected: false,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should show load more button when hasNextPage is true', () => {
    const mockFetchNextPage = vi.fn();
    mockUseActivities.mockReturnValue({
      activities: [
        {
          id: 'activity-1',
          tenant_id: 'tenant-1',
          agent_id: 'agent-1',
          type: 'task.created',
          title: 'Test Activity',
          description: 'Test',
          metadata: {},
          created_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      hasNextPage: true,
      fetchNextPage: mockFetchNextPage,
      refetch: vi.fn(),
      isRealtimeConnected: true,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    const loadMoreButton = screen.getByRole('button', { name: /load more activities/i });
    fireEvent.click(loadMoreButton);

    expect(mockFetchNextPage).toHaveBeenCalled();
  });

  it('should navigate to task detail when task activity is clicked', async () => {
    const mockActivities = [
      {
        id: 'activity-1',
        tenant_id: 'tenant-1',
        agent_id: 'agent-1',
        type: 'task.created',
        title: 'Test Task Activity',
        description: 'Test',
        metadata: {},
        related_task_id: 'task-123',
        created_at: new Date().toISOString(),
      },
    ];

    mockUseActivities.mockReturnValue({
      activities: mockActivities,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      isRealtimeConnected: true,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    await waitFor(() => {
      expect(screen.getByText('Test Task Activity')).toBeInTheDocument();
    });

    // Click on the activity item
    const activityItem = screen.getByText('Test Task Activity').closest('[class*="group"]');
    if (activityItem) {
      fireEvent.click(activityItem);
    }

    expect(mockRouter.push).toHaveBeenCalledWith('/portal/tasks/task-123');
  });

  it('should navigate to agent detail when agent activity is clicked', async () => {
    const mockActivities = [
      {
        id: 'activity-1',
        tenant_id: 'tenant-1',
        agent_id: 'agent-456',
        type: 'agent.spawned',
        title: 'Agent Spawned Activity',
        description: 'Test',
        metadata: {},
        created_at: new Date().toISOString(),
      },
    ];

    mockUseActivities.mockReturnValue({
      activities: mockActivities,
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      error: null,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      isRealtimeConnected: true,
      isRealtimeReconnecting: false,
      retryRealtime: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    await waitFor(() => {
      expect(screen.getByText('Agent Spawned Activity')).toBeInTheDocument();
    });

    // Click on the activity item
    const activityItem = screen.getByText('Agent Spawned Activity').closest('[class*="group"]');
    if (activityItem) {
      fireEvent.click(activityItem);
    }

    expect(mockRouter.push).toHaveBeenCalledWith('/portal/agents/agent-456');
  });

  it('should render ActivityFilters component', () => {
    render(<ActivityFeedPageClient />);

    // ActivityFilters should be rendered (we check for filter buttons/labels)
    expect(screen.getByText('All Activity')).toBeInTheDocument();
    // Use getAllByText since 'Tasks' appears in both sidebar and filters
    expect(screen.getAllByText('Tasks').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Decisions').length).toBeGreaterThan(0);
  });

  it('should render with initialAgentId filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: [{ id: 'agent-123', name: 'Test Agent' }],
      }),
    });

    render(<ActivityFeedPageClient initialAgentId="agent-123" />);

    await waitFor(() => {
      expect(mockUseActivities).toHaveBeenCalledWith(
        expect.objectContaining({
          agentId: 'agent-123',
        })
      );
    });
  });
});
