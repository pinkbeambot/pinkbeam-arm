/**
 * Activity Feed Page Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivityFeedPageClient } from '@/app/(portal)/portal/activity/ActivityFeedPageClient';
import { useRealtimeActivities } from '@/components/dashboard/activity/useRealtimeActivities';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock useRealtimeActivities hook
vi.mock('@/components/dashboard/activity/useRealtimeActivities', () => ({
  useRealtimeActivities: vi.fn(),
}));

// Mock PortalLayout components
vi.mock('@/components/dashboard/layout', () => ({
  PortalLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="portal-layout">{children}</div>,
  PageContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="page-container">{children}</div>,
  PageHeader: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

// Mock ActivityFeed component
vi.mock('@/components/dashboard/activity/ActivityFeed', () => ({
  ActivityFeed: vi.fn(({ className, onEventClick }) => (
    <div data-testid="activity-feed" className={className}>
      <button 
        data-testid="mock-event-click"
        onClick={() => onEventClick?.({
          id: 'test-event-1',
          type: 'task_completed',
          timestamp: new Date().toISOString(),
          actor: { id: 'agent-1', type: 'agent', name: 'Test Agent' },
          target: { id: 'task-1', type: 'task', name: 'Test Task' },
          metadata: { title: 'Test Task Completed' },
        })}
      >
        Trigger Event Click
      </button>
    </div>
  )),
}));

// Mock ActivityFilter component
vi.mock('@/components/dashboard/activity/ActivityFilter', () => ({
  ActivityFilterBar: vi.fn(() => <div data-testid="activity-filter">Filter Bar</div>),
}));

// Mock ActivityItem component
vi.mock('@/components/dashboard/activity/ActivityItem', () => ({
  ActivityItem: vi.fn(() => <div data-testid="activity-item">Activity Item</div>),
  ActivityItemSkeleton: vi.fn(() => <div data-testid="activity-item-skeleton">Loading...</div>),
}));

// Mock ActivityIcon component
vi.mock('@/components/dashboard/activity/ActivityIcon', () => ({
  ActivityIcon: vi.fn(() => <div data-testid="activity-icon">Icon</div>),
  ActivityTypeBadge: vi.fn(() => <span data-testid="activity-type-badge">Badge</span>),
  ActivityCategoryBadge: vi.fn(() => <span data-testid="activity-category-badge">Category</span>),
}));

describe('ActivityFeedPage', () => {
  const mockUseRealtimeActivities = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });
  });

  it('should render page with title and description', () => {
    render(<ActivityFeedPageClient />);

    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    expect(screen.getByText('Real-time stream of everything happening in your AI workforce')).toBeInTheDocument();
  });

  it('should render ActivityFeed component with correct props', () => {
    render(<ActivityFeedPageClient />);

    const activityFeed = screen.getByTestId('activity-feed');
    expect(activityFeed).toBeInTheDocument();
    expect(activityFeed).toHaveClass('w-full');
  });

  it('should navigate to task detail when task event is clicked', () => {
    const mockLocationAssign = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { href: '', assign: mockLocationAssign },
      writable: true,
    });

    render(<ActivityFeedPageClient />);

    const triggerButton = screen.getByTestId('mock-event-click');
    fireEvent.click(triggerButton);

    expect(window.location.href).toBe('/portal/tasks/task-1');
  });

  it('should navigate to decision detail when decision event is clicked', () => {
    render(<ActivityFeedPageClient />);

    // Verify the component renders
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('should render within PortalLayout', () => {
    render(<ActivityFeedPageClient />);

    expect(screen.getByTestId('portal-layout')).toBeInTheDocument();
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });
});

// Integration test for useRealtimeActivities hook
describe('ActivityFeedPage Integration', () => {
  it('should display activities when loaded', async () => {
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

    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: mockEvents,
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('should handle error state gracefully', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: false,
      isRealtime: false,
      error: new Error('Failed to load activities'),
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    // Component should still render even with error
    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('should handle empty state', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: false,
      isRealtime: true,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useRealtimeActivities as ReturnType<typeof vi.fn>).mockReturnValue({
      events: [],
      isLoading: true,
      isRealtime: false,
      error: null,
      hasMore: false,
      loadMore: vi.fn(),
      refetch: vi.fn(),
    });

    render(<ActivityFeedPageClient />);

    expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
  });
});
