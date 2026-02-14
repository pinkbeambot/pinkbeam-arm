/**
 * Activity Tab Tests
 * 
 * Tests for the ActivityTab component showing agent activity feed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityTab } from '@/components/dashboard/agents/ActivityTab';
import type { ActivityEvent } from '@/components/dashboard/activity/types';

// Mock the activity feed hook
const mockUseActivityFeed = vi.fn();
vi.mock('@/components/dashboard/activity/useActivityFeed', () => ({
  useActivityFeed: (options: Record<string, unknown>) => mockUseActivityFeed(options),
}));

// Mock ActivityItem component
vi.mock('@/components/dashboard/activity/ActivityItem', () => ({
  ActivityItem: vi.fn(({ event, isNew }: { event: ActivityEvent; isNew?: boolean }) => (
    <div data-testid={`activity-item-${event.id}`} data-is-new={isNew}>
      {event.metadata.title}
    </div>
  )),
  ActivityItemSkeleton: vi.fn(() => <div data-testid="activity-item-skeleton" />),
}));

// Mock UI components
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: vi.fn(() => <div data-testid="skeleton" />),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>),
  AlertDescription: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>),
}));

vi.mock('@/components/ui/button', () => ({
  Button: vi.fn(({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button data-testid="button" onClick={onClick} disabled={disabled}>{children}</button>
  )),
}));

const mockEvents: ActivityEvent[] = [
  {
    id: 'evt-1',
    type: 'task_completed',
    timestamp: '2024-02-14T10:00:00Z',
    actor: { id: 'agent-123', type: 'agent', name: 'Test Agent' },
    target: { id: 'task-1', type: 'task', name: 'Research Task' },
    metadata: { title: 'Completed research task', description: 'Task completed successfully' },
  },
  {
    id: 'evt-2',
    type: 'decision_made',
    timestamp: '2024-02-14T09:30:00Z',
    actor: { id: 'agent-123', type: 'agent', name: 'Test Agent' },
    metadata: { title: 'Made strategic decision', confidence: 85 },
  },
  {
    id: 'evt-3',
    type: 'escalation_created',
    timestamp: '2024-02-14T09:00:00Z',
    actor: { id: 'agent-123', type: 'agent', name: 'Test Agent' },
    metadata: { title: 'Escalated issue', description: 'Needs approval' },
  },
];

describe('ActivityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseActivityFeed.mockReturnValue({
      events: [],
      isLoading: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    expect(screen.getAllByTestId('activity-item-skeleton').length).toBeGreaterThan(0);
  });

  it('should render error state', () => {
    const refetch = vi.fn();
    mockUseActivityFeed.mockReturnValue({
      events: [],
      isLoading: false,
      error: new Error('Failed to load activities'),
      hasMore: false,
      loadMore: vi.fn(),
      refetch,
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load activity feed/)).toBeInTheDocument();
    
    // Click retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(refetch).toHaveBeenCalled();
  });

  it('should render empty state when no activities', () => {
    mockUseActivityFeed.mockReturnValue({
      events: [],
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    expect(screen.getByText(/No recent activity/)).toBeInTheDocument();
    expect(screen.getByText(/This agent hasn't performed any actions recently./)).toBeInTheDocument();
  });

  it('should render activity list', () => {
    mockUseActivityFeed.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    // Check all events are rendered
    expect(screen.getByTestId('activity-item-evt-1')).toBeInTheDocument();
    expect(screen.getByTestId('activity-item-evt-2')).toBeInTheDocument();
    expect(screen.getByTestId('activity-item-evt-3')).toBeInTheDocument();
  });

  it('should mark first 3 events as new', () => {
    mockUseActivityFeed.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    // First 3 should be marked as new
    expect(screen.getByTestId('activity-item-evt-1')).toHaveAttribute('data-is-new', 'true');
    expect(screen.getByTestId('activity-item-evt-2')).toHaveAttribute('data-is-new', 'true');
    expect(screen.getByTestId('activity-item-evt-3')).toHaveAttribute('data-is-new', 'true');
  });

  it('should show realtime indicator when realtime is active', () => {
    mockUseActivityFeed.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      isRealtime: true,
    });

    render(<ActivityTab agentId="agent-123" />);

    expect(screen.getByText('Live updates')).toBeInTheDocument();
  });

  it('should call loadMore when button is clicked', () => {
    const loadMore = vi.fn();
    mockUseActivityFeed.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      hasMore: true,
      loadMore,
      refetch: vi.fn(),
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    const loadMoreButton = screen.getByText('Load more');
    fireEvent.click(loadMoreButton);
    expect(loadMore).toHaveBeenCalled();
  });

  it('should show end of feed message when no more items', () => {
    mockUseActivityFeed.mockReturnValue({
      events: mockEvents,
      isLoading: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    expect(screen.getByText('End of activity feed')).toBeInTheDocument();
  });

  it('should pass correct filter to useActivityFeed', () => {
    mockUseActivityFeed.mockReturnValue({
      events: [],
      isLoading: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
      isRealtime: false,
    });

    render(<ActivityTab agentId="agent-123" />);

    expect(mockUseActivityFeed).toHaveBeenCalledWith({
      filter: {
        agentId: 'agent-123',
        type: 'all',
        timeRange: '7d',
      },
      enabled: true,
    });
  });

});
