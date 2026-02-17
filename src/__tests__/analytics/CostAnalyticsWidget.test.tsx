import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CostAnalyticsWidget } from '@/components/analytics/CostAnalyticsWidget';
import type { CostAnalyticsResponse } from '@/types/analytics';

const mockCostData = {
  trends: [
    { date: '2024-01-01', cost: 10.50, taskCount: 5, costPerTask: 2.10 },
    { date: '2024-01-02', cost: 15.75, taskCount: 7, costPerTask: 2.25 },
    { date: '2024-01-03', cost: 8.25, taskCount: 4, costPerTask: 2.06 },
  ],
  breakdown: [
    { category: 'completed', amount: 25.50, percentage: 75 },
    { category: 'in_progress', amount: 8.50, percentage: 25 },
  ],
  byAgent: [
    { agentId: '1', agentName: 'Agent A', totalCost: 20.00, taskCount: 10, avgCostPerTask: 2.00, tokensUsed: 5000 },
    { agentId: '2', agentName: 'Agent B', totalCost: 14.00, taskCount: 6, avgCostPerTask: 2.33, tokensUsed: 3500 },
  ],
  summary: {
    totalCost: 34.50,
    totalTasks: 16,
    avgCostPerTask: 2.16,
    totalTokens: 8500,
    projectedMonthlyCost: 1035.00,
  },
};

describe('CostAnalyticsWidget', () => {
  it('renders loading state correctly', () => {
    render(<CostAnalyticsWidget isLoading />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders cost data correctly', () => {
    render(
      <CostAnalyticsWidget
        trends={mockCostData.trends}
        breakdown={mockCostData.breakdown}
        byAgent={mockCostData.byAgent}
        summary={mockCostData.summary}
        isLoading={false}
      />
    );
    
    // Check header
    expect(screen.getByText('LLM Costs')).toBeInTheDocument();
    expect(screen.getByText('16 tasks processed')).toBeInTheDocument();
    
    // Check total cost
    expect(screen.getByText('$35')).toBeInTheDocument();
  });

  it('renders trend chart', () => {
    render(
      <CostAnalyticsWidget
        trends={mockCostData.trends}
        breakdown={mockCostData.breakdown}
        byAgent={mockCostData.byAgent}
        summary={mockCostData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('14-Day Trend')).toBeInTheDocument();
  });

  it('renders top agents by cost', () => {
    render(
      <CostAnalyticsWidget
        trends={mockCostData.trends}
        breakdown={mockCostData.breakdown}
        byAgent={mockCostData.byAgent}
        summary={mockCostData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Top Agents by Cost')).toBeInTheDocument();
    expect(screen.getByText('Agent A')).toBeInTheDocument();
    expect(screen.getByText('Agent B')).toBeInTheDocument();
  });

  it('renders summary stats correctly', () => {
    render(
      <CostAnalyticsWidget
        trends={mockCostData.trends}
        breakdown={mockCostData.breakdown}
        byAgent={mockCostData.byAgent}
        summary={mockCostData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Avg per Task')).toBeInTheDocument();
    expect(screen.getByText('Projected/Month')).toBeInTheDocument();
  });
});
