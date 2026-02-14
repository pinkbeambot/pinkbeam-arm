/**
 * ActivityFeed Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityFeed } from '@/components/dashboard/activity/ActivityFeed';
import { useRealtimeActivities } from '@/components/dashboard/activity/useRealtimeActivities';

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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: true,
      isRealtime: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    // Should show multiple skeleton items (5 by default)
    const skeletons = screen.getAllByTestId('activity-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render events when loaded', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText('Task Completed')).toBeInTheDocument();
    expect(screen.getByText('Agent Spawned')).toBeInTheDocument();
  });

  it('should show empty state when no events', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText('No activities found')).toBeInTheDocument();
  });

  it('should show error state when there is an error', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: false,
      isRealtime: false,
      error: new Error('Failed to load activities'),
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    // Check for the error heading
    const errorHeadings = screen.getAllByText('Failed to load activities');
    expect(errorHeadings.length).toBeGreaterThan(0);
    // Check for the try again button
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('should show realtime indicator when connected', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-icon')).toBeInTheDocument();
  });

  it('should show offline indicator when disconnected', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByTestId('wifi-off-icon')).toBeInTheDocument();
  });

  it('should call refetch when refresh button is clicked', () => {
    const mockRefetch = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: mockRefetch,
    });

    render(<ActivityFeed />);

    // Find the refresh button by its icon or by being a button in the header area
    const refreshButton = screen.getAllByRole('button')[0];
    fireEvent.click(refreshButton);

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should call loadMore when load more button is clicked', () => {
    const mockLoadMore = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: true,
      loadMore: mockLoadMore,
      refetch: vi.fn(),
    });

    render(<ActivityFeed />);

    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    fireEvent.click(loadMoreButton);

    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('should render filter bar when showFilters is true', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed showFilters={true} />);

    expect(screen.getByTestId('activity-filter-bar')).toBeInTheDocument();
  });

  it('should not render filter bar when showFilters is false', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed showFilters={false} />);

    expect(screen.queryByTestId('activity-filter-bar')).not.toBeInTheDocument();
  });

  it('should call onEventClick when an event is clicked', () => {
    const mockOnEventClick = vi.fn();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed onEventClick={mockOnEventClick} />);

    const eventItem = screen.getByTestId('activity-item-event-1');
    fireEvent.click(eventItem);

    expect(mockOnEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('should apply custom className', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    const { container } = render(<ActivityFeed className="custom-class" />);

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should show empty state with filter message when filters are active', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeed initialFilter={{ type: 'tasks', search: 'test' }} />);

    expect(screen.getByText('No activities found')).toBeInTheDocument();
    // The empty state shows different message based on whether filters are active
    expect(screen.getByText(/Try adjusting your filters to see more activities/i)).toBeInTheDocument();
  });
});
