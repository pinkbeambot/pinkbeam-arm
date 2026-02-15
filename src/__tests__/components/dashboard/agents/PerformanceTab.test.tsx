/**
 * Performance Tab Tests
 * 
 * Tests for the PerformanceTab component showing agent analytics.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceTab } from '@/components/dashboard/agents/PerformanceTab';
import type { AgentAnalyticsData } from '@/lib/hooks/useAgentAnalytics';

// Mock recharts to avoid rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>),
  BarChart: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>),
  PieChart: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>),
  Line: vi.fn(() => <div data-testid="line" />),
  Bar: vi.fn(() => <div data-testid="bar" />),
  Pie: vi.fn(() => <div data-testid="pie" />),
  Cell: vi.fn(() => <div data-testid="cell" />),
  XAxis: vi.fn(() => <div data-testid="x-axis" />),
  YAxis: vi.fn(() => <div data-testid="y-axis" />),
  CartesianGrid: vi.fn(() => <div data-testid="cartesian-grid" />),
  Tooltip: vi.fn(() => <div data-testid="tooltip" />),
  Legend: vi.fn(() => <div data-testid="legend" />),
  ResponsiveContainer: vi.fn(({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  )),
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>),
  CardContent: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>),
  CardHeader: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>),
  CardTitle: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>),
  CardDescription: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="card-description">{children}</div>),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: vi.fn(() => <div data-testid="skeleton" />),
}));

vi.mock('@/components/ui/alert', () => ({
  Alert: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="alert">{children}</div>),
  AlertDescription: vi.fn(({ children }: { children: React.ReactNode }) => <div data-testid="alert-description">{children}</div>),
}));

const mockAnalyticsData: AgentAnalyticsData = {
  agent: {
    id: 'agent-123',
    name: 'Test Agent',
    avatarUrl: 'https://example.com/avatar.png',
    role: 'worker',
    status: 'active',
    description: 'A test agent',
    createdAt: '2024-01-01T00:00:00Z',
    llmConfig: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      max_tokens: 2000,
    },
    limits: {
      max_sub_agents: 5,
      escalation_threshold: 0.8,
      timeout_seconds: 300,
      max_tokens_per_task: 4000,
      max_cost_per_task_usd: 1.0,
    },
  },
  summary: {
    totalTasksCompleted: 150,
    totalTasksFailed: 10,
    totalTasksCreated: 160,
    successRate: 0.9375,
    avgTaskDuration: 120,
    totalCost: 45.5,
    totalEscalations: 5,
    totalDecisions: 50,
    totalOverridden: 2,
    overrideRate: 4,
    avgConfidence: 0.85,
  },
  taskTypeBreakdown: [
    { type: 'research', count: 60, completed: 55, failed: 5, cost: 18, successRate: 91.67 },
    { type: 'writing', count: 50, completed: 48, failed: 2, cost: 15, successRate: 96 },
    { type: 'analysis', count: 30, completed: 28, failed: 2, cost: 9, successRate: 93.33 },
    { type: 'review', count: 20, completed: 19, failed: 1, cost: 3.5, successRate: 95 },
  ],
  workloadDistribution: Array(24).fill(0).map((_, i) => ({
    hour: i,
    tasks: i >= 8 && i <= 18 ? Math.floor(Math.random() * 10) : 0,
  })),
  dailyTrend: [
    { date: '2024-02-01', tasksCompleted: 10, tasksFailed: 1, successRate: 0.91, cost: 3, escalations: 0, avgDuration: 120, confidence: 0.85 },
    { date: '2024-02-02', tasksCompleted: 12, tasksFailed: 0, successRate: 1, cost: 3.5, escalations: 1, avgDuration: 110, confidence: 0.88 },
    { date: '2024-02-03', tasksCompleted: 8, tasksFailed: 2, successRate: 0.8, cost: 2.5, escalations: 0, avgDuration: 130, confidence: 0.82 },
    { date: '2024-02-04', tasksCompleted: 15, tasksFailed: 1, successRate: 0.94, cost: 4.5, escalations: 0, avgDuration: 115, confidence: 0.90 },
  ],
  decisionConfidenceTrend: [
    { date: '2024-02-01', confidence: 85 },
    { date: '2024-02-02', confidence: 88 },
    { date: '2024-02-03', confidence: 82 },
  ],
  escalationResolutionTrend: [
    { date: '2024-02-01', resolutionTime: 300 },
    { date: '2024-02-02', resolutionTime: 240 },
  ],
  recentTasks: [
    { type: 'research', status: 'completed', createdAt: '2024-02-04T10:00:00Z', cost: 0.5 },
    { type: 'writing', status: 'completed', createdAt: '2024-02-04T09:00:00Z', cost: 0.3 },
  ],
  period: { days: 30 },
};

describe('PerformanceTab', () => {
  it('should render loading state', () => {
    render(<PerformanceTab isLoading={true} />);

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
  });

  it('should render error state', () => {
    const error = new Error('Failed to load analytics');
    render(<PerformanceTab error={error} />);

    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load performance data/)).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<PerformanceTab data={null} />);

    expect(screen.getByText(/No performance data available/)).toBeInTheDocument();
  });

  it('should render metrics with data', () => {
    render(<PerformanceTab data={mockAnalyticsData} />);

    // Check key metrics are displayed
    expect(screen.getByText('150')).toBeInTheDocument(); // Tasks Completed
    expect(screen.getByText('93.8%')).toBeInTheDocument(); // Success Rate
    expect(screen.getByText('$45.50')).toBeInTheDocument(); // Total Cost
  });

  it('should render charts when trend data exists', () => {
    render(<PerformanceTab data={mockAnalyticsData} />);

    // Charts should be rendered (use getAllByTestId since there are multiple charts)
    expect(screen.getAllByTestId('line-chart').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('bar-chart').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('pie-chart').length).toBeGreaterThan(0);
  });

  it('should display correct subtext for success rate', () => {
    render(<PerformanceTab data={mockAnalyticsData} />);

    // With 93.75% success rate, should show "Good"
    expect(screen.getByText('Good')).toBeInTheDocument();
  });

  it('should display escalations count', () => {
    render(<PerformanceTab data={mockAnalyticsData} />);

    expect(screen.getByText('5')).toBeInTheDocument(); // Total escalations
  });

  it('should display decisions info', () => {
    render(<PerformanceTab data={mockAnalyticsData} />);

    expect(screen.getByText('50')).toBeInTheDocument(); // Total decisions
    expect(screen.getByText('2 overridden')).toBeInTheDocument();
  });
});
