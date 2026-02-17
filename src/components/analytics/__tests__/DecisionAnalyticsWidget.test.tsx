import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DecisionAnalyticsWidget } from '../DecisionAnalyticsWidget';
import type { DecisionAnalyticsResponse } from '@/types/analytics';

const mockDecisionData = {
  categories: [
    { category: 'action', total: 20, approved: 15, rejected: 3, overridden: 2, approvalRate: 75 },
    { category: 'resource', total: 10, approved: 8, rejected: 1, overridden: 1, approvalRate: 80 },
    { category: 'strategy', total: 5, approved: 3, rejected: 1, overridden: 1, approvalRate: 60 },
  ],
  trends: [
    { date: '2024-01-01', proposed: 5, approved: 4, rejected: 1, overridden: 0 },
    { date: '2024-01-02', proposed: 8, approved: 6, rejected: 1, overridden: 1 },
    { date: '2024-01-03', proposed: 6, approved: 5, rejected: 0, overridden: 1 },
  ],
  summary: {
    totalDecisions: 35,
    approvedCount: 26,
    rejectedCount: 5,
    overriddenCount: 4,
    pendingCount: 0,
    overallApprovalRate: 74.29,
    avgConfidence: 0.85,
  },
};

describe('DecisionAnalyticsWidget', () => {
  it('renders loading state correctly', () => {
    render(<DecisionAnalyticsWidget isLoading />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders decision data correctly', () => {
    render(
      <DecisionAnalyticsWidget
        categories={mockDecisionData.categories}
        trends={mockDecisionData.trends}
        summary={mockDecisionData.summary}
        isLoading={false}
      />
    );
    
    // Check header
    expect(screen.getByText('Decisions')).toBeInTheDocument();
    expect(screen.getByText('35 total decisions')).toBeInTheDocument();
    
    // Check approval rate
    expect(screen.getByText('74%')).toBeInTheDocument();
    
    // Check category names
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Resource')).toBeInTheDocument();
    expect(screen.getByText('Strategy')).toBeInTheDocument();
  });

  it('renders category metrics correctly', () => {
    render(
      <DecisionAnalyticsWidget
        categories={mockDecisionData.categories}
        trends={mockDecisionData.trends}
        summary={mockDecisionData.summary}
        isLoading={false}
      />
    );
    
    // Check category totals
    expect(screen.getByText('20 total')).toBeInTheDocument();
    expect(screen.getByText('10 total')).toBeInTheDocument();
    
    // Check approval rate badges
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders summary stats', () => {
    render(
      <DecisionAnalyticsWidget
        categories={mockDecisionData.categories}
        trends={mockDecisionData.trends}
        summary={mockDecisionData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('26')).toBeInTheDocument();
    
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    
    expect(screen.getByText('Overridden')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renders trend chart section', () => {
    render(
      <DecisionAnalyticsWidget
        categories={mockDecisionData.categories}
        trends={mockDecisionData.trends}
        summary={mockDecisionData.summary}
        isLoading={false}
      />
    );
    
    expect(screen.getByText('7-Day Trend')).toBeInTheDocument();
  });
});
