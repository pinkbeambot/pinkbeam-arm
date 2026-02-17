import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AgentPerformanceWidget } from '@/components/analytics/AgentPerformanceWidget';
import type { AgentPerformanceMetrics, AgentPerformanceResponse } from '@/types/analytics';

const mockAgents: AgentPerformanceMetrics[] = [
  {
    agentId: '1',
    agentName: 'Test Agent 1',
    agentRole: 'worker',
    tasksCompleted: 10,
    tasksFailed: 2,
    tasksInProgress: 3,
    successRate: 83.33,
    avgTaskDuration: 15,
    totalCost: 50.00,
    escalationsRaised: 1,
    lastActiveAt: '2024-01-01T00:00:00Z',
  },
  {
    agentId: '2',
    agentName: 'Test Agent 2',
    agentRole: 'manager',
    tasksCompleted: 25,
    tasksFailed: 0,
    tasksInProgress: 5,
    successRate: 100,
    avgTaskDuration: 10,
    totalCost: 120.50,
    escalationsRaised: 0,
    lastActiveAt: '2024-01-02T00:00:00Z',
  },
];

const mockSummary = {
  totalAgents: 2,
  activeAgents: 2,
  totalTasksCompleted: 35,
  overallSuccessRate: 91.67,
  totalCost: 170.50,
};

describe('AgentPerformanceWidget', () => {
  it('renders loading state correctly', () => {
    render(<AgentPerformanceWidget isLoading />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders agent data correctly', () => {
    render(
      <AgentPerformanceWidget
        data={mockAgents}
        summary={mockSummary}
        isLoading={false}
      />
    );
    
    // Check header
    expect(screen.getByText('Agent Performance')).toBeInTheDocument();
    expect(screen.getByText('2 of 2 agents active')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument(); // tasks completed
    
    // Check agent names
    expect(screen.getByText('Test Agent 1')).toBeInTheDocument();
    expect(screen.getByText('Test Agent 2')).toBeInTheDocument();
    
    // Check role labels
    expect(screen.getByText('Worker')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    
    // Check task counts
    expect(screen.getByText('10 tasks')).toBeInTheDocument();
    expect(screen.getByText('25 tasks')).toBeInTheDocument();
  });

  it('renders empty state when no data', () => {
    render(
      <AgentPerformanceWidget
        data={[]}
        summary={mockSummary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('No agent data available')).toBeInTheDocument();
  });

  it('displays success rates correctly', () => {
    render(
      <AgentPerformanceWidget
        data={mockAgents}
        summary={mockSummary}
        isLoading={false}
      />
    );
    
    // Check success rate labels
    const successRates = screen.getAllByText(/Success Rate/);
    expect(successRates.length).toBeGreaterThan(0);
  });

  it('formats currency correctly', () => {
    render(
      <AgentPerformanceWidget
        data={mockAgents}
        summary={mockSummary}
        isLoading={false}
      />
    );
    
    // Check for dollar amounts
    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText('$121')).toBeInTheDocument();
  });
});
