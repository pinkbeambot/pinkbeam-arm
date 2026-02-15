/**
 * Dashboard Page Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import DashboardPage from '@/app/(portal)/portal/page';
import { useDashboardStats } from '@/components/dashboard/useDashboardStats';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}));

// Mock dashboard stats hook
vi.mock('@/components/dashboard/useDashboardStats', () => ({
  useDashboardStats: vi.fn(),
}));

// Mock ActivityFeed component - needs to match actual import path
vi.mock('@/components/dashboard/activity', () => ({
  ActivityFeed: vi.fn(() => <div data-testid="activity-feed">Activity Feed</div>),
}));

// Mock PortalLayout components
vi.mock('@/components/dashboard/layout', () => ({
  PortalLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PageHeader: ({ children, title, description }: { children: React.ReactNode; title: string; description: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </div>
  ),
}));

describe('DashboardPage', () => {
  const mockPush = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });
  });

  function mockStats(overrides = {}) {
    return {
      stats: {
        activeAgents: 5,
        tasksCompletedToday: 12,
        pendingEscalations: 3,
        avgResponseTime: null,
      },
      isLoading: false,
      error: null,
      refetch: mockRefetch,
      ...overrides,
    };
  }

  it('should render dashboard with title and description', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    expect(screen.getByText('Portal')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your AI workforce command center.')).toBeInTheDocument();
  });

  it('should display stat labels', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    expect(screen.getByText('Active Agents')).toBeInTheDocument();
    expect(screen.getByText('Tasks Today')).toBeInTheDocument();
    expect(screen.getByText('Pending Escalations')).toBeInTheDocument();
    expect(screen.getByText('Avg Response')).toBeInTheDocument();
  });

  it('should have Quick Actions section', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create agent/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view performance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manage team/i })).toBeInTheDocument();
  });

  it('should have Getting Started section', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Create your first agent')).toBeInTheDocument();
    expect(screen.getByText('Assign a task')).toBeInTheDocument();
    expect(screen.getByText('Monitor activity')).toBeInTheDocument();
  });

  it('should navigate when Create Agent is clicked', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    const createAgentButton = screen.getByRole('button', { name: /create agent/i });
    fireEvent.click(createAgentButton);

    expect(mockPush).toHaveBeenCalledWith('/portal/agents');
  });

  it('should navigate when View Performance is clicked', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    const viewPerformanceButton = screen.getByRole('button', { name: /view performance/i });
    fireEvent.click(viewPerformanceButton);

    expect(mockPush).toHaveBeenCalledWith('/portal/performance');
  });

  it('should navigate when Manage Team is clicked', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    const manageTeamButton = screen.getByRole('button', { name: /manage team/i });
    fireEvent.click(manageTeamButton);

    expect(mockPush).toHaveBeenCalledWith('/portal/agents');
  });

  it('should show Create Task button in header', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
  });

  it('should navigate to tasks when Create Task is clicked', () => {
    (useDashboardStats as ReturnType<typeof vi.fn>).mockReturnValue(mockStats());

    render(<DashboardPage />);

    const createTaskButton = screen.getByRole('button', { name: /create task/i });
    fireEvent.click(createTaskButton);

    expect(mockPush).toHaveBeenCalledWith('/portal/tasks');
  });
});
