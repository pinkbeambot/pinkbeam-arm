/**
 * Activity Feed Page Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ActivityFeedPage from '@/app/(portal)/portal/activity/page';

// Mock the ActivityFeed component
vi.mock('@/components/dashboard/activity', () => ({
  ActivityFeed: vi.fn((props: Record<string, unknown>) => (
    <div data-testid="activity-feed" data-props={JSON.stringify(props)}>
      Activity Feed Component
    </div>
  )),
}));

// Mock the layout components
vi.mock('@/components/dashboard/layout', () => ({
  PortalLayout: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="portal-layout">{children}</div>
  )),
  PageContainer: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-container">{children}</div>
  )),
  PageHeader: vi.fn(({ title, description }: { title: string; description: string }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  )),
}));

describe('ActivityFeedPage', () => {
  it('should render the page with correct title and description', () => {
    render(<ActivityFeedPage />);

    // Check page header
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
    expect(screen.getByText('Activity Feed')).toBeInTheDocument();
    expect(screen.getByText('Real-time stream of everything happening in your AI workforce')).toBeInTheDocument();
  });

  it('should render within PortalLayout and PageContainer', () => {
    render(<ActivityFeedPage />);

    expect(screen.getByTestId('portal-layout')).toBeInTheDocument();
    expect(screen.getByTestId('page-container')).toBeInTheDocument();
  });

  it('should render ActivityFeed with correct props', () => {
    render(<ActivityFeedPage />);

    const activityFeed = screen.getByTestId('activity-feed');
    expect(activityFeed).toBeInTheDocument();

    // Parse the props passed to ActivityFeed
    const props = JSON.parse(activityFeed.getAttribute('data-props') || '{}');
    
    expect(props.showFilters).toBe(true);
    expect(props.realtime).toBe(true);
    expect(props.autoScroll).toBe(true);
    expect(props.maxHeight).toBe('calc(100vh - 280px)');
    expect(props.className).toBe('min-h-[500px]');
  });

  it('should render ActivityFeed component text', () => {
    render(<ActivityFeedPage />);

    expect(screen.getByText('Activity Feed Component')).toBeInTheDocument();
  });
});
