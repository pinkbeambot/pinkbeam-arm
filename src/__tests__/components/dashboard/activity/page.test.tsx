/**
 * Activity Feed Page Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityFeedPageClient } from '@/app/(portal)/portal/activity/ActivityFeedPageClient';

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
vi.mock('@/components/dashboard/activity', () => ({
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

describe('ActivityFeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
    });

    render(<ActivityFeedPageClient />);

    const triggerButton = screen.getByTestId('mock-event-click');
    fireEvent.click(triggerButton);

    expect(window.location.href).toBe('/portal/tasks/task-1');
  });

  it('should render within PortalLayout', () => {
    render(<ActivityFeedPageClient />);

    expect(screen.getByTestId('portal-layout')).toBeInTheDocument();
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });
});
