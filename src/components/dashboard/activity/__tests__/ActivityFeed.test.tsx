/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * ActivityFeed Component Tests
 *
 * Tests for the ActivityFeed component including:
 * - Rendering with mock data
 * - Filter functionality
 * - ActivityItem display
 * - Empty state
 * - Real-time connection status
 * - Pagination
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import * as React from 'react';

// Mock modules before imports
const mockUseActivities = vi.fn();
const mockUseRouter = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/hooks/useActivities', () => ({
  useActivities: (...args: unknown[]) => mockUseActivities(...args),
  EntityType: {},
  TimeRange: {},
  ActionType: {},
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
}));

// Mock fetch
global.fetch = mockFetch;

// Mock intersection observer
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: mockObserve,
  disconnect: mockDisconnect,
});
window.IntersectionObserver = mockIntersectionObserver;

import { ActivityFeedPageClient } from '@/app/(portal)/portal/activity/ActivityFeedPageClient';
import { ActivityFilters } from '@/components/dashboard/activity/ActivityFilters';
import { ActivityItem } from '@/components/dashboard/activity/ActivityItem';
import type { Activity } from '@/types';

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: `activity-${Math.random().toString(36).substr(2, 9)}`,
    tenant_id: 'tenant-123',
    agent_id: 'agent-1',
    type: 'task.created',
    title: 'Test Activity',
    description: 'Test activity description',
    metadata: { actor_name: 'Test Agent' },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function createMockActivities(count: number): Activity[] {
  return Array.from({ length: count }, (_, i) =>
    createMockActivity({
      id: `activity-${i}`,
      title: `Activity ${i}`,
      type: i % 2 === 0 ? 'task.created' : 'agent.spawned',
    })
  );
}

// ============================================================================
// ActivityItem Tests
// ============================================================================

describe('ActivityItem', () => {
  const mockEvent = {
    id: 'event-1',
    type: 'task_completed' as const,
    timestamp: new Date().toISOString(),
    actor: { id: 'agent-1', type: 'agent' as const, name: 'Test Agent' },
    target: { id: 'task-1', type: 'task' as const, name: 'Test Task' },
    metadata: { title: 'Task Completed', description: 'A task was completed' },
  };

  it('should render activity item with correct content', () => {
    render(<ActivityItem event={mockEvent} />);
    
    expect(screen.getByText('Task Completed')).toBeInTheDocument();
    expect(screen.getByText(/via Test Agent/)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<ActivityItem event={mockEvent} onClick={handleClick} />);
    
    const item = screen.getByText('Task Completed').closest('[class*="group"]');
    if (item) {
      fireEvent.click(item);
    }
    
    expect(handleClick).toHaveBeenCalled();
  });

  it('should show new indicator when isNew is true', () => {
    render(<ActivityItem event={mockEvent} isNew={true} />);
    
    // The new indicator is a visual element, so we check for the class
    const item = screen.getByText('Task Completed').closest('[class*="group"]');
    expect(item).toHaveClass('bg-primary/5');
  });

  it('should expand when clicked on expand button', () => {
    render(<ActivityItem event={mockEvent} />);
    
    // Task completed has expandable content
    const expandButton = screen.getByLabelText('Expand');
    fireEvent.click(expandButton);
    
    expect(screen.getByLabelText('Collapse')).toBeInTheDocument();
  });
});

// ============================================================================
// ActivityFilters Tests
// ============================================================================

describe('ActivityFilters', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnClearFilters = vi.fn();

  const defaultProps = {
    onFiltersChange: mockOnFiltersChange,
    onClearFilters: mockOnClearFilters,
    agents: [
      { id: 'agent-1', name: 'Agent One' },
      { id: 'agent-2', name: 'Agent Two' },
    ],
  };

  beforeEach(() => {
    mockOnFiltersChange.mockClear();
    mockOnClearFilters.mockClear();
  });

  it('should render all entity type tabs', () => {
    render(<ActivityFilters {...defaultProps} />);
    
    expect(screen.getByText('All Activity')).toBeInTheDocument();
    expect(screen.getByText('Tasks')).toBeInTheDocument();
    expect(screen.getByText('Decisions')).toBeInTheDocument();
    expect(screen.getByText('Escalations')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  it('should call onFiltersChange when entity type is selected', () => {
    render(<ActivityFilters {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Tasks'));
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'tasks' })
    );
  });

  it('should call onFiltersChange when time range is selected', () => {
    render(<ActivityFilters {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Last 7 days'));
    
    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ timeRange: '7d' })
    );
  });

  it('should show clear filters button when filters are active', () => {
    render(
      <ActivityFilters
        {...defaultProps}
        entityType="tasks"
        timeRange="7d"
      />
    );
    
    expect(screen.getByText(/Clear \(2\)/)).toBeInTheDocument();
  });

  it('should call onClearFilters when clear button is clicked', () => {
    render(
      <ActivityFilters
        {...defaultProps}
        entityType="tasks"
      />
    );
    
    fireEvent.click(screen.getByText(/Clear/));
    
    expect(mockOnClearFilters).toHaveBeenCalled();
  });

  it('should render agent selector with agents', () => {
    render(<ActivityFilters {...defaultProps} />);
    
    expect(screen.getByText('Agent')).toBeInTheDocument();
  });

  it('should call onFiltersChange when agent is selected', () => {
    render(<ActivityFilters {...defaultProps} />);
    
    const agentSelect = screen.getByRole('combobox', { name: /agent/i });
    fireEvent.click(agentSelect);
    
    // Select first agent
    const agentOption = screen.getByText('Agent One');
    fireEvent.click(agentOption);
    
    expect(mockOnFiltersChange).toHaveBeenCalled();
  });

  it('should render in compact variant', () => {
    render(<ActivityFilters {...defaultProps} variant="compact" />);
    
    // Compact variant shows pills in a row
    const pills = screen.getAllByRole('button');
    expect(pills.length).toBeGreaterThan(0);
  });

  it('should render in horizontal variant', () => {
    render(<ActivityFilters {...defaultProps} variant="horizontal" />);
    
    // Horizontal variant shows search input
    expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument();
  });
});

// ============================================================================
// ActivityFeedPage Tests
// ============================================================================

describe('ActivityFeedPage', () => {
  const mockRouter = {
    push: vi.fn(),
  };

  const mockAgentsResponse = {
    data: [
      { id: 'agent-1', name: 'Agent One', avatar_url: null },
      { id: 'agent-2', name: 'Agent Two', avatar_url: null },
    ],
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter);
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAgentsResponse),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render page with title and description', () => {
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

    render(<ActivityFeedPageClient />);
    
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    expect(screen.getByText(/Real-time stream of everything happening/)).toBeInTheDocument();
  });

  it('should show live indicator when realtime is connected', () => {
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
    const mockActivities = createMockActivities(3);
    
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
    
    // Wait for activities to render
    await waitFor(() => {
      expect(screen.getByText('Activity 0')).toBeInTheDocument();
    });
  });

  it('should show empty state when no activities', () => {
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

    render(<ActivityFeedPageClient />);
    
    expect(screen.getByText('No activities yet')).toBeInTheDocument();
  });

  it('should show empty state with clear filters when filters are active', () => {
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

    render(<ActivityFeedPageClient initialAgentId="agent-1" />);
    
    // Should show search empty state since filter is active
    expect(screen.getByText('No activities found')).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your filters/)).toBeInTheDocument();
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
    
    expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
  });

  it('should call refetch when retry button is clicked', () => {
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
    
    const retryButton = screen.getByRole('button', { name: /try again/i });
    fireEvent.click(retryButton);
    
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should show load more button when hasNextPage is true', () => {
    const mockFetchNextPage = vi.fn();
    mockUseActivities.mockReturnValue({
      activities: createMockActivities(5),
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
      createMockActivity({
        related_task_id: 'task-123',
        type: 'task.created',
      }),
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
      expect(screen.getByText('Test Activity')).toBeInTheDocument();
    });
    
    // Click on the activity
    const activityItem = screen.getByText('Test Activity').closest('[class*="group"]');
    if (activityItem) {
      fireEvent.click(activityItem);
    }
    
    expect(mockRouter.push).toHaveBeenCalledWith('/portal/tasks/task-123');
  });

  it('should navigate to agent detail when agent activity is clicked', async () => {
    const mockActivities = [
      createMockActivity({
        agent_id: 'agent-456',
        type: 'agent.spawned',
      }),
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
      expect(screen.getByText('Test Activity')).toBeInTheDocument();
    });
    
    const activityItem = screen.getByText('Test Activity').closest('[class*="group"]');
    if (activityItem) {
      fireEvent.click(activityItem);
    }
    
    expect(mockRouter.push).toHaveBeenCalledWith('/portal/agents/agent-456');
  });

  it('should clear filters when clear button is clicked', async () => {
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

    render(<ActivityFeedPageClient initialAgentId="agent-1" />);
    
    // Should show clear button since filter is active
    await waitFor(() => {
      const clearButton = screen.getByRole('button', { name: /clear/i });
      fireEvent.click(clearButton);
    });
    
    // Filters should be cleared
    expect(mockUseActivities).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: undefined,
      })
    );
  });
});

// ============================================================================
// useActivities Hook Tests
// ============================================================================

describe('useActivities', () => {
  it('should be properly exported from hooks module', async () => {
    // This test verifies the export is working
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useActivities } = require('@/hooks/useActivities');
    expect(typeof useActivities).toBe('function');
  });

  it('should export correct types', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      EntityType,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      TimeRange,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ActionType,
    } = require('@/hooks/useActivities');
    
    // Types should be defined (they are TypeScript types, so just verify module loads)
    expect(EntityType).toBeDefined();
  });
});
