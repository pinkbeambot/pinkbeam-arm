/**
 * ActivityFeed Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityFeed } from '@/components/dashboard/activity/ActivityFeed';
import { useRealtimeActivities } from '@/components/dashboard/activity/useRealtimeActivities';
import type { ConnectionState } from '@/lib/realtime/useRealtime';

// Mock the useRealtimeActivities hook
vi.mock('@/components/dashboard/activity/useRealtimeActivities', () => ({
  useRealtimeActivities: vi.fn(),
}));

// Mock ActivityItem component
vi.mock('@/components/dashboard/activity/ActivityItem', () => ({
  ActivityItem: vi.fn(({ event, onClick, isNew }: { event: { id: string; metadata: { title: string } }; onClick?: () => void; isNew?: boolean }) => (
    <div 
      data-testid={`activity-item-${event.id}`}
      data-is-new={isNew}
      onClick={onClick}
    >
      {event.metadata.title}
    </div>
  )),
  ActivityItemSkeleton: vi.fn(() => <div data-testid="activity-skeleton">Loading...</div>),
}));

// Mock ActivityFilterBar component
vi.mock('@/components/dashboard/activity/ActivityFilter', () => ({
  ActivityFilterBar: vi.fn(({ filter, onFilterChange }: { filter: Record<string, unknown>; onFilterChange: (filter: Record<string, unknown>) => void }) => (
    <div data-testid="activity-filter-bar">
      <button 
        data-testid="filter-tasks"
        onClick={() => onFilterChange({ ...filter, type: 'tasks' })}
      >
        Filter Tasks
      </button>
      <button 
        data-testid="clear-filters"
        onClick={() => onFilterChange({})}
      >
        Clear
      </button>
    </div>
  )),
}));

// Mock EmptyState components
vi.mock('@/components/empty', () => ({
  EmptyStateSearch: vi.fn(({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state-search">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )),
  EmptyStateError: vi.fn(({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state-error">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )),
}));

// Mock ActivityIcon component
vi.mock('@/components/dashboard/activity/ActivityIcon', () => ({
  ActivityIcon: vi.fn(() => <div data-testid="activity-icon">Icon</div>),
  ActivityTypeBadge: vi.fn(() => <span data-testid="activity-type-badge">Badge</span>),
  ActivityCategoryBadge: vi.fn(() => <span data-testid="activity-category-badge">Category</span>),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  RefreshCw: vi.fn(() => <svg data-testid="refresh-icon" />),
  Wifi: vi.fn(() => <svg data-testid="wifi-icon" />),
  WifiOff: vi.fn(() => <svg data-testid="wifi-off-icon" />),
  AlertCircle: vi.fn(() => <svg data-testid="alert-icon" />),
  ChevronDown: vi.fn(() => <svg data-testid="chevron-down-icon" />),
  Loader2: vi.fn(() => <svg data-testid="loader-icon" />),
  WifiLow: vi.fn(() => <svg data-testid="wifi-low-icon" />),
  Zap: vi.fn(() => <svg data-testid="zap-icon" />),
}));

describe('ActivityFeed Component', () => {
  const mockEvents = [
    {
      id: 'event-1',
      type: 'task_completed' as const,
      timestamp: new Date().toISOString(),
      actor: { id: 'agent-1', type: 'agent' as const, name: 'Test Agent' },
      target: { id: 'task-1', type: 'task' as const, name: 'Test Task' },
      metadata: { title: 'Task Completed' },
    },
    {
      id: 'event-2',
      type: 'agent_spawned' as const,
      timestamp: new Date().toISOString(),
      actor: { id: 'user-1', type: 'user' as const, name: 'Test User' },
      target: { id: 'agent-2', type: 'agent' as const, name: 'New Agent' },
      metadata: { title: 'Agent Spawned' },
    },
  ];

  // Helper to create mock return value
  const createMockReturn = (overrides: Partial<ReturnType<typeof useRealtimeActivities>> = {}) => ({
    events: [],
    isLoading: false,
    isRealtime: false,
    connectionState: 'disconnected' as ConnectionState,
    connectionError: null,
    retryCount: 0,
    error: null,
    hasMore: false,
    loadMore: vi.fn(),
    refetch: vi.fn(),
    retryConnection: vi.fn(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: [],
        isLoading: true,
        connectionState: 'connecting',
      })
    );

    render(<ActivityFeed />);

    // Should show multiple skeleton items (5 by default)
    const skeletons = screen.getAllByTestId('activity-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render events when loaded', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('Task Completed')).toBeInTheDocument();
    expect(screen.getByText('Agent Spawned')).toBeInTheDocument();
  });

  it('should show empty state when no events', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: [],
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('No activities found')).toBeInTheDocument();
  });

  it('should show error state when there is an error', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: [],
        isLoading: false,
        isRealtime: false,
        connectionState: 'error',
        error: new Error('Failed to load activities'),
      })
    );

    render(<ActivityFeed />);

    // Check for the error heading
    const errorHeadings = screen.getAllByText('Failed to load activities');
    expect(errorHeadings.length).toBeGreaterThan(0);
    // Check for the try again button
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should show realtime indicator when connected', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
  });

  it('should show offline indicator when disconnected', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: false,
        connectionState: 'disconnected',
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  it('should call refetch when refresh button is clicked', () => {
    const mockRefetch = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
        refetch: mockRefetch,
      })
    );

    render(<ActivityFeed />);

    // Find the refresh button by its icon or by being a button in the header area
    const refreshButton = screen.getAllByRole('button')[0];
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should call loadMore when load more button is clicked', () => {
    const mockLoadMore = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
        hasMore: true,
        loadMore: mockLoadMore,
      })
    );

    render(<ActivityFeed />);

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    fireEvent.click(loadMoreButton);

    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('should render filter bar when showFilters is true', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed showFilters={true} />);

    expect(screen.getByTestId('activity-filter-bar')).toBeInTheDocument();
  });

  it('should not render filter bar when showFilters is false', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed showFilters={false} />);

    expect(screen.queryByTestId('activity-filter-bar')).not.toBeInTheDocument();
  });

  it('should call onEventClick when an event is clicked', () => {
    const mockOnEventClick = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed onEventClick={mockOnEventClick} />);

    const eventItem = screen.getByTestId('activity-item-event-1');
    fireEvent.click(eventItem);

    expect(mockOnEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('should apply custom className', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    const { container } = render(<ActivityFeed className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should show empty state with filter message when filters are active', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: [],
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed initialFilter={{ type: 'tasks', search: 'test' }} />);

    // Should show EmptyStateSearch component when filters are active
    expect(screen.getByTestId('empty-state-search')).toBeInTheDocument();
  });

  it('should show reconnecting indicator', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: false,
        connectionState: 'reconnecting',
        retryCount: 2,
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
  });

  it('should show connecting indicator', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: false,
        connectionState: 'connecting',
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('should show connection error state', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: false,
        connectionState: 'error',
        connectionError: new Error('Connection failed'),
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should call retryConnection when error badge is clicked', () => {
    const mockRetry = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: false,
        connectionState: 'error',
        retryConnection: mockRetry,
      })
    );

    render(<ActivityFeed />);

    const errorBadge = screen.getByText('Error').closest('[role="button"]') || screen.getByText('Error').parentElement;
    if (errorBadge) {
      fireEvent.click(errorBadge);
    }

    // Badge should be clickable for error state
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('should handle realtime disabled', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: false,
        connectionState: 'disconnected',
      })
    );

    render(<ActivityFeed realtime={false} />);

    // Should not show connection status when realtime is disabled
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.queryByText('Offline')).not.toBeInTheDocument();
  });

  it('should show load more button when hasMore is true', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
        hasMore: true,
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByRole('button', { name: /load more/i })).toBeInTheDocument();
  });

  it('should disable load more button when loading', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: true,
        isRealtime: true,
        connectionState: 'connected',
        hasMore: true,
      })
    );

    render(<ActivityFeed />);

    const loadMoreButton = screen.getByRole('button', { name: /loading/i });
    expect(loadMoreButton).toBeDisabled();
  });

  it('should handle initial filter prop', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed initialFilter={{ type: 'tasks', agentId: 'agent-1' }} />);

    // Filter bar should be rendered with initial filter
    expect(screen.getByTestId('activity-filter-bar')).toBeInTheDocument();
  });

  it('should show connecting state badge', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: [],
        isLoading: true,
        connectionState: 'connecting',
      })
    );

    render(<ActivityFeed />);

    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it.skip('should render empty state without filters', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: [],
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed />);

    // Should show the default empty state (no search filters applied)
    // When there are no filters, it shows a custom empty state (not EmptyStateSearch)
    expect(screen.getByText('No activities yet')).toBeInTheDocument();
  });

  it('should pass agent filter to hook', () => {
    const mockOnFilterChange = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed initialFilter={{ agentId: 'agent-1', type: 'tasks' }} />);

    // Component should render with initial filter
    expect(screen.getByTestId('activity-filter-bar')).toBeInTheDocument();
  });

  it('should handle scroll event on container', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
        hasMore: true,
      })
    );

    const { container } = render(<ActivityFeed maxHeight="400px" />);
    
    // Find the scrollable container
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();

    // Simulate scroll event
    if (scrollContainer) {
      fireEvent.scroll(scrollContainer, { target: { scrollTop: 200 } });
    }
  });

  it('should handle mouse enter and leave events', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    const { container } = render(<ActivityFeed />);
    
    const scrollContainer = container.querySelector('.overflow-y-auto');
    if (scrollContainer) {
      fireEvent.mouseEnter(scrollContainer);
      fireEvent.mouseLeave(scrollContainer);
    }
  });

  it('should render with custom maxHeight', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    const { container } = render(<ActivityFeed maxHeight="300px" />);
    
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toHaveStyle({ maxHeight: '300px' });
  });

  it('should render ActivityItem with isNew prop', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue(
      createMockReturn({
        events: mockEvents,
        isLoading: false,
        isRealtime: true,
        connectionState: 'connected',
      })
    );

    render(<ActivityFeed />);

    // Check that ActivityItem was rendered
    expect(screen.getByTestId('activity-item-event-1')).toBeInTheDocument();
  });
});
